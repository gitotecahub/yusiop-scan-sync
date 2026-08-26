-- fix_rpc_identity_checks: validación de identidad en RPCs SECURITY DEFINER
-- Nota: cuando la llamada viene del servidor (service_role en edge functions)
-- auth.uid() es NULL; en ese caso no se aplica el chequeo porque ya es un
-- contexto de confianza. Con JWT de usuario, p_user_id debe ser el propio.

CREATE OR REPLACE FUNCTION public.consume_download(p_user_id uuid, p_song_id uuid, p_ip text DEFAULT NULL::text, p_country_code text DEFAULT NULL::text, p_country_name text DEFAULT NULL::text, p_city text DEFAULT NULL::text, p_region text DEFAULT NULL::text)
 RETURNS TABLE(success boolean, source text, message text, balance_info jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_existing public.user_downloads%ROWTYPE;
  v_card public.qr_cards%ROWTYPE;
  v_sub public.user_subscriptions%ROWTYPE;
  v_settings public.admin_financial_settings%ROWTYPE;
  v_price numeric;
  v_wallet_res record;
  v_email text;
  v_is_admin boolean;
  v_recent int;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::text, 'user_id requerido'::text, '{}'::jsonb; RETURN;
  END IF;
  IF p_song_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::text, 'song_id requerido'::text, '{}'::jsonb; RETURN;
  END IF;

  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN QUERY SELECT false, NULL::text, 'No autorizado'::text, '{}'::jsonb; RETURN;
  END IF;

  -- Bloquear admins/moderadores
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role IN ('admin','moderator')
  ) INTO v_is_admin;
  IF v_is_admin THEN
    RETURN QUERY SELECT false, NULL::text,
      'Los administradores no pueden descargar música'::text, '{}'::jsonb;
    RETURN;
  END IF;

  -- Anti-abuso: máx 10 descargas/minuto por usuario
  SELECT count(*) INTO v_recent
  FROM public.user_downloads
  WHERE user_id = p_user_id
    AND downloaded_at > now() - interval '1 minute';
  IF v_recent >= 10 THEN
    RETURN QUERY SELECT false, NULL::text,
      'Demasiadas descargas. Espera un momento.'::text, '{}'::jsonb;
    RETURN;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;

  -- 0) Si ya descargó la canción antes: re-descarga gratis (restaurar si oculta)
  SELECT * INTO v_existing FROM public.user_downloads
  WHERE user_id = p_user_id AND song_id = p_song_id
  ORDER BY downloaded_at DESC LIMIT 1;

  IF FOUND THEN
    IF v_existing.hidden_from_library THEN
      UPDATE public.user_downloads SET hidden_from_library = false WHERE id = v_existing.id;
    END IF;
    RETURN QUERY SELECT true, 'existing'::text, 'Re-descarga gratuita'::text,
      jsonb_build_object('restored', v_existing.hidden_from_library);
    RETURN;
  END IF;

  -- 1) QR card
  SELECT * INTO v_card FROM public.qr_cards
  WHERE (owner_user_id = p_user_id OR activated_by = p_user_id)
    AND download_credits > 0
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    UPDATE public.qr_cards
    SET download_credits = download_credits - 1
    WHERE id = v_card.id;

    INSERT INTO public.user_downloads
      (user_id, song_id, qr_card_id, user_email, card_type, download_type,
       ip_address, country_code, country_name, city, region)
    VALUES
      (p_user_id, p_song_id, v_card.id, v_email, v_card.card_type::text, 'real',
       p_ip, p_country_code, p_country_name, p_city, p_region);

    RETURN QUERY SELECT true, 'qr_card'::text, 'OK'::text,
      jsonb_build_object('credits_left', v_card.download_credits - 1,
                         'card_type', v_card.card_type);
    RETURN;
  END IF;

  -- 2) Suscripción activa
  SELECT * INTO v_sub FROM public.user_subscriptions
  WHERE user_id = p_user_id
    AND status = 'active'
    AND current_period_end > now()
    AND downloads_remaining > 0
  ORDER BY current_period_end DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    UPDATE public.user_subscriptions
    SET downloads_remaining = downloads_remaining - 1,
        last_event_at = now()
    WHERE id = v_sub.id;

    INSERT INTO public.user_downloads
      (user_id, song_id, user_email, card_type, download_type,
       ip_address, country_code, country_name, city, region)
    VALUES
      (p_user_id, p_song_id, v_email, 'subscription', 'real',
       p_ip, p_country_code, p_country_name, p_city, p_region);

    RETURN QUERY SELECT true, 'subscription'::text, 'OK'::text,
      jsonb_build_object('downloads_left', v_sub.downloads_remaining - 1);
    RETURN;
  END IF;

  -- 3) Wallet
  SELECT * INTO v_settings FROM public.admin_financial_settings WHERE id = 1;
  v_price := COALESCE(v_settings.wallet_price_per_download_xaf, 250);

  SELECT * INTO v_wallet_res FROM public.wallet_consume_for_download(p_user_id, p_song_id, v_price);

  IF v_wallet_res.success THEN
    INSERT INTO public.user_downloads
      (user_id, song_id, user_email, card_type, download_type,
       ip_address, country_code, country_name, city, region)
    VALUES
      (p_user_id, p_song_id, v_email, 'wallet', 'real',
       p_ip, p_country_code, p_country_name, p_city, p_region);

    RETURN QUERY SELECT true, 'wallet'::text, 'OK'::text,
      jsonb_build_object('balance_after', v_wallet_res.balance_after,
                         'price_xaf', v_price);
    RETURN;
  END IF;

  -- Sin créditos en ninguna fuente
  RETURN QUERY SELECT false, NULL::text,
    'Sin créditos disponibles. Compra una tarjeta, suscríbete o recarga tu wallet.'::text,
    jsonb_build_object('wallet_balance', v_wallet_res.balance_after,
                       'price_required_xaf', v_price);
END;
$function$;

CREATE OR REPLACE FUNCTION public.redeem_gift_card(p_token text, p_user_id uuid, p_user_email text)
 RETURNS TABLE(success boolean, message text, card_id uuid, card_type card_type, download_credits integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_card public.qr_cards%ROWTYPE;
BEGIN
  IF auth.uid() IS NOT NULL
     AND (p_user_id IS DISTINCT FROM auth.uid()
          OR lower(coalesce(p_user_email,'')) IS DISTINCT FROM lower(coalesce(auth.email(),''))) THEN
    RETURN QUERY SELECT false, 'No autorizado'::text, NULL::uuid, NULL::public.card_type, 0;
    RETURN;
  END IF;

  -- Bloquear fila para evitar doble canje concurrente
  SELECT * INTO v_card
  FROM public.qr_cards
  WHERE redemption_token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Código de regalo inválido'::text, NULL::uuid, NULL::public.card_type, 0;
    RETURN;
  END IF;

  IF v_card.gift_redeemed THEN
    RETURN QUERY SELECT false, 'Esta tarjeta ya ha sido canjeada'::text, NULL::uuid, NULL::public.card_type, 0;
    RETURN;
  END IF;

  IF NOT v_card.is_gift THEN
    RETURN QUERY SELECT false, 'Esta tarjeta no es un regalo'::text, NULL::uuid, NULL::public.card_type, 0;
    RETURN;
  END IF;

  UPDATE public.qr_cards
  SET owner_user_id = p_user_id,
      activated_by = p_user_id,
      activated_at = now(),
      is_activated = true,
      gift_redeemed = true,
      gift_redeemed_at = now(),
      redemption_token = NULL
  WHERE id = v_card.id;

  INSERT INTO public.gift_redemptions (qr_card_id, redeemed_by_user_id, redeemed_by_email)
  VALUES (v_card.id, p_user_id, p_user_email);

  RETURN QUERY SELECT
    true,
    'Tarjeta canjeada con éxito'::text,
    v_card.id,
    v_card.card_type,
    v_card.download_credits;
END;
$function$;

CREATE OR REPLACE FUNCTION public.claim_pending_song_gifts(p_user_id uuid, p_email text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_email_norm text := lower(trim(p_email));
  v_gift record;
  v_wallet_res record;
  v_download_id uuid;
  v_sender_name text;
  v_sender_email text;
  v_count int := 0;
BEGIN
  IF p_user_id IS NULL OR v_email_norm IS NULL THEN
    RETURN 0;
  END IF;

  IF auth.uid() IS NOT NULL
     AND (p_user_id IS DISTINCT FROM auth.uid()
          OR v_email_norm IS DISTINCT FROM lower(auth.email())) THEN
    RETURN 0;
  END IF;

  FOR v_gift IN
    SELECT * FROM public.song_gifts
    WHERE status = 'pending_signup'
      AND lower(recipient_email) = v_email_norm
    ORDER BY created_at ASC
  LOOP
    -- Cobrar al emisor ahora
    SELECT * INTO v_wallet_res
    FROM public.wallet_consume_for_download(v_gift.sender_user_id, v_gift.song_id, v_gift.amount_xaf::numeric);

    IF NOT v_wallet_res.success THEN
      UPDATE public.song_gifts
      SET status = 'failed',
          message = COALESCE(message, '') || ' [Sin saldo del emisor al canjear]'
      WHERE id = v_gift.id;

      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (
        v_gift.sender_user_id,
        'song_gift_failed',
        'Tu regalo no pudo entregarse',
        'No tenías saldo suficiente cuando ' || v_email_norm || ' canjeó "' || v_gift.song_title_snapshot || '".',
        jsonb_build_object('gift_id', v_gift.id, 'song_id', v_gift.song_id)
      );
      CONTINUE;
    END IF;

    SELECT id INTO v_download_id
    FROM public.user_downloads
    WHERE user_id = p_user_id AND song_id = v_gift.song_id
    LIMIT 1;

    IF v_download_id IS NULL THEN
      INSERT INTO public.user_downloads
        (user_id, song_id, user_email, card_type, download_type)
      VALUES
        (p_user_id, v_gift.song_id, p_email, 'gift', 'real')
      RETURNING id INTO v_download_id;
    END IF;

    UPDATE public.song_gifts
    SET status = 'completed',
        recipient_user_id = p_user_id,
        download_id = v_download_id,
        claimed_at = now()
    WHERE id = v_gift.id;

    SELECT email INTO v_sender_email FROM auth.users WHERE id = v_gift.sender_user_id;
    SELECT COALESCE(full_name, username, split_part(v_sender_email, '@', 1))
      INTO v_sender_name
    FROM public.profiles WHERE user_id = v_gift.sender_user_id LIMIT 1;
    v_sender_name := COALESCE(v_sender_name, 'Un amigo');

    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      p_user_id,
      'song_gift_received',
      '🎁 Has recibido una canción',
      v_sender_name || ' te ha regalado "' || v_gift.song_title_snapshot || '" de ' || v_gift.artist_name_snapshot,
      jsonb_build_object(
        'gift_id', v_gift.id,
        'song_id', v_gift.song_id,
        'song_title', v_gift.song_title_snapshot,
        'artist_name', v_gift.artist_name_snapshot,
        'sender_name', v_sender_name
      )
    );

    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_gift.sender_user_id,
      'song_gift_claimed',
      'Tu regalo fue canjeado',
      v_email_norm || ' se ha registrado y ha recibido "' || v_gift.song_title_snapshot || '".',
      jsonb_build_object('gift_id', v_gift.id, 'song_id', v_gift.song_id)
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$function$;

-- La variante con p_user_id se usa internamente (consume_download y regalos,
-- donde el usuario cobrado puede ser el emisor del regalo). No debe ser
-- invocable directamente por clientes.
REVOKE ALL ON FUNCTION public.wallet_consume_for_download(uuid, uuid, numeric) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_consume_for_download(uuid, uuid, numeric) TO service_role;
