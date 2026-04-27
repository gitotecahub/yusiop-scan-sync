
-- ============================================================
-- 1) BUCKET songs PRIVADO + storage policies
-- ============================================================
UPDATE storage.buckets SET public = false WHERE id = 'songs';

-- Eliminar políticas antiguas si existen
DROP POLICY IF EXISTS "Public read access to songs" ON storage.objects;
DROP POLICY IF EXISTS "Songs are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read songs" ON storage.objects;

-- Solo admins pueden leer/subir/borrar directamente. El acceso de usuarios
-- finales es a través de signed URLs generadas por edge function tras consumir crédito.
CREATE POLICY "Admins manage songs bucket"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'songs' AND public.is_admin(auth.uid()))
WITH CHECK (bucket_id = 'songs' AND public.is_admin(auth.uid()));

-- ============================================================
-- 2) user_downloads: user_id obligatorio + índice anti-fraude
-- ============================================================
ALTER TABLE public.user_downloads ALTER COLUMN user_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_downloads_user_recent
  ON public.user_downloads (user_id, downloaded_at DESC);

-- ============================================================
-- 3) Configuración: precio por descarga vía wallet
-- ============================================================
ALTER TABLE public.admin_financial_settings
  ADD COLUMN IF NOT EXISTS wallet_price_per_download_xaf integer NOT NULL DEFAULT 250;

-- ============================================================
-- 4) wallet_consume_for_download (atómica) — usada por consume_download
-- ============================================================
CREATE OR REPLACE FUNCTION public.wallet_consume_for_download(
  p_user_id uuid,
  p_song_id uuid,
  p_amount numeric
)
RETURNS TABLE(success boolean, message text, balance_after numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet public.user_wallets%ROWTYPE;
  v_new_balance numeric;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'user_id requerido'::text, 0::numeric;
    RETURN;
  END IF;

  SELECT * INTO v_wallet FROM public.user_wallets WHERE user_id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Wallet no existe'::text, 0::numeric;
    RETURN;
  END IF;

  IF v_wallet.balance < p_amount THEN
    RETURN QUERY SELECT false, 'Saldo insuficiente'::text, v_wallet.balance;
    RETURN;
  END IF;

  v_new_balance := v_wallet.balance - p_amount;

  UPDATE public.user_wallets
  SET balance = v_new_balance,
      total_spent = total_spent + p_amount,
      updated_at = now()
  WHERE id = v_wallet.id;

  INSERT INTO public.wallet_transactions
    (wallet_id, user_id, type, amount, balance_after, status, related_song_id, description)
  VALUES
    (v_wallet.id, p_user_id, 'purchase', -p_amount, v_new_balance, 'completed', p_song_id, 'Descarga de canción');

  RETURN QUERY SELECT true, 'OK'::text, v_new_balance;
END;
$$;

-- ============================================================
-- 5) FUNCIÓN CENTRAL consume_download
--    Prioridad: 1) QR card  2) Suscripción  3) Wallet
-- ============================================================
CREATE OR REPLACE FUNCTION public.consume_download(
  p_user_id uuid,
  p_song_id uuid,
  p_ip text DEFAULT NULL,
  p_country_code text DEFAULT NULL,
  p_country_name text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_region text DEFAULT NULL
)
RETURNS TABLE(
  success boolean,
  source text,        -- 'existing','qr_card','subscription','wallet'
  message text,
  balance_info jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.consume_download(uuid,uuid,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_download(uuid,uuid,text,text,text,text,text) TO authenticated, service_role;
