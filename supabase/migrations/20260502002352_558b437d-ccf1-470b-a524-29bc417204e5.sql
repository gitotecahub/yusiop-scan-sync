-- ============================================================
-- Sistema de regalo de canciones (song gifting)
-- ============================================================

-- 1) Enum de estado del regalo
DO $$ BEGIN
  CREATE TYPE public.song_gift_status AS ENUM ('completed', 'pending_signup', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Tabla song_gifts
CREATE TABLE IF NOT EXISTS public.song_gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_user_id uuid NOT NULL,
  recipient_user_id uuid,
  recipient_email text,
  song_id uuid NOT NULL,
  song_title_snapshot text,
  artist_name_snapshot text,
  amount_xaf integer NOT NULL DEFAULT 0,
  message text,
  status public.song_gift_status NOT NULL DEFAULT 'completed',
  download_id uuid,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT song_gifts_recipient_chk CHECK (
    recipient_user_id IS NOT NULL OR recipient_email IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_song_gifts_sender ON public.song_gifts(sender_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_song_gifts_recipient_user ON public.song_gifts(recipient_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_song_gifts_recipient_email ON public.song_gifts(lower(recipient_email)) WHERE status = 'pending_signup';

ALTER TABLE public.song_gifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own song gifts" ON public.song_gifts;
CREATE POLICY "Users view own song gifts"
ON public.song_gifts FOR SELECT
TO authenticated
USING (
  sender_user_id = auth.uid()
  OR recipient_user_id = auth.uid()
  OR (recipient_email IS NOT NULL AND lower(recipient_email) = lower(auth.email()))
  OR is_admin(auth.uid())
);

DROP POLICY IF EXISTS "Admins manage song gifts" ON public.song_gifts;
CREATE POLICY "Admins manage song gifts"
ON public.song_gifts FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_song_gifts_updated_at ON public.song_gifts;
CREATE TRIGGER trg_song_gifts_updated_at
BEFORE UPDATE ON public.song_gifts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3) FUNCIÓN: gift_song
--    Atómica: descuenta wallet del emisor + crea download para
--    el destinatario + registra gift + notifica a ambos.
--    Si recipient_email no está registrado: queda 'pending_signup'
--    SIN descontar nada al emisor.
-- ============================================================
CREATE OR REPLACE FUNCTION public.gift_song(
  p_song_id uuid,
  p_recipient_user_id uuid DEFAULT NULL,
  p_recipient_email text DEFAULT NULL,
  p_message text DEFAULT NULL
)
RETURNS TABLE(success boolean, status text, message text, gift_id uuid, balance_after numeric, price_xaf integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender uuid := auth.uid();
  v_sender_email text;
  v_sender_name text;
  v_song record;
  v_settings public.admin_financial_settings%ROWTYPE;
  v_price integer;
  v_recipient uuid;
  v_email_norm text;
  v_already_dl uuid;
  v_wallet_res record;
  v_download_id uuid;
  v_gift_id uuid;
  v_is_admin boolean;
BEGIN
  IF v_sender IS NULL THEN
    RETURN QUERY SELECT false, 'unauthorized'::text, 'No autenticado'::text, NULL::uuid, 0::numeric, 0;
    RETURN;
  END IF;

  IF p_song_id IS NULL THEN
    RETURN QUERY SELECT false, 'invalid'::text, 'song_id requerido'::text, NULL::uuid, 0::numeric, 0;
    RETURN;
  END IF;

  IF p_recipient_user_id IS NULL AND (p_recipient_email IS NULL OR length(trim(p_recipient_email)) = 0) THEN
    RETURN QUERY SELECT false, 'invalid'::text, 'Debes indicar un destinatario'::text, NULL::uuid, 0::numeric, 0;
    RETURN;
  END IF;

  -- Bloquear admins/moderadores como emisores
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_sender AND role IN ('admin','moderator')
  ) INTO v_is_admin;
  IF v_is_admin THEN
    RETURN QUERY SELECT false, 'forbidden'::text, 'Los administradores no pueden regalar canciones'::text, NULL::uuid, 0::numeric, 0;
    RETURN;
  END IF;

  -- Verificar canción
  SELECT s.id, s.title, COALESCE(a.name, s.title) AS artist_name
    INTO v_song
  FROM public.songs s
  LEFT JOIN public.artists a ON a.id = s.artist_id
  WHERE s.id = p_song_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'not_found'::text, 'Canción no encontrada'::text, NULL::uuid, 0::numeric, 0;
    RETURN;
  END IF;

  -- Datos del emisor
  SELECT email INTO v_sender_email FROM auth.users WHERE id = v_sender;
  SELECT COALESCE(full_name, username, split_part(v_sender_email, '@', 1))
    INTO v_sender_name
  FROM public.profiles WHERE user_id = v_sender LIMIT 1;
  v_sender_name := COALESCE(v_sender_name, split_part(v_sender_email, '@', 1), 'Un amigo');

  -- Resolver destinatario
  v_recipient := p_recipient_user_id;
  v_email_norm := lower(trim(p_recipient_email));

  IF v_recipient IS NULL AND v_email_norm IS NOT NULL THEN
    SELECT id INTO v_recipient FROM auth.users WHERE lower(email) = v_email_norm LIMIT 1;
  END IF;

  -- No regalarse a uno mismo
  IF v_recipient = v_sender THEN
    RETURN QUERY SELECT false, 'self'::text, 'No puedes regalarte a ti mismo'::text, NULL::uuid, 0::numeric, 0;
    RETURN;
  END IF;

  -- Precio
  SELECT * INTO v_settings FROM public.admin_financial_settings WHERE id = 1;
  v_price := COALESCE(v_settings.wallet_price_per_download_xaf, 250);

  -- ============================================================
  -- CASO A: destinatario registrado → operación completa
  -- ============================================================
  IF v_recipient IS NOT NULL THEN
    -- Si el destinatario ya tiene la canción descargada, no cobrar
    SELECT id INTO v_already_dl
    FROM public.user_downloads
    WHERE user_id = v_recipient AND song_id = p_song_id
    LIMIT 1;

    IF v_already_dl IS NOT NULL THEN
      RETURN QUERY SELECT false, 'already_owned'::text,
        'El destinatario ya tiene esta canción'::text, NULL::uuid, 0::numeric, v_price;
      RETURN;
    END IF;

    -- Cobrar al emisor desde wallet
    SELECT * INTO v_wallet_res FROM public.wallet_consume_for_download(v_sender, p_song_id, v_price::numeric);

    IF NOT v_wallet_res.success THEN
      RETURN QUERY SELECT false, 'insufficient_funds'::text,
        v_wallet_res.message, NULL::uuid, v_wallet_res.balance_after, v_price;
      RETURN;
    END IF;

    -- Insertar descarga para destinatario
    INSERT INTO public.user_downloads
      (user_id, song_id, user_email, card_type, download_type)
    VALUES
      (v_recipient,
       p_song_id,
       (SELECT email FROM auth.users WHERE id = v_recipient),
       'gift',
       'real')
    RETURNING id INTO v_download_id;

    -- Registrar regalo
    INSERT INTO public.song_gifts
      (sender_user_id, recipient_user_id, recipient_email, song_id,
       song_title_snapshot, artist_name_snapshot, amount_xaf, message,
       status, download_id, claimed_at)
    VALUES
      (v_sender, v_recipient, v_email_norm, p_song_id,
       v_song.title, v_song.artist_name, v_price, NULLIF(p_message, ''),
       'completed', v_download_id, now())
    RETURNING id INTO v_gift_id;

    -- Notificación al destinatario
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_recipient,
      'song_gift_received',
      '🎁 Has recibido una canción',
      v_sender_name || ' te ha regalado "' || v_song.title || '" de ' || v_song.artist_name,
      jsonb_build_object(
        'gift_id', v_gift_id,
        'song_id', p_song_id,
        'song_title', v_song.title,
        'artist_name', v_song.artist_name,
        'sender_name', v_sender_name,
        'message', p_message
      )
    );

    -- Notificación al emisor
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_sender,
      'song_gift_sent',
      'Regalo enviado',
      'Has regalado "' || v_song.title || '". Se han descontado ' || v_price || ' XAF de tu saldo.',
      jsonb_build_object(
        'gift_id', v_gift_id,
        'song_id', p_song_id,
        'song_title', v_song.title,
        'recipient_user_id', v_recipient,
        'amount_xaf', v_price
      )
    );

    RETURN QUERY SELECT true, 'completed'::text, 'OK'::text, v_gift_id,
      v_wallet_res.balance_after, v_price;
    RETURN;
  END IF;

  -- ============================================================
  -- CASO B: email no registrado → pending_signup, no se cobra
  -- ============================================================
  INSERT INTO public.song_gifts
    (sender_user_id, recipient_user_id, recipient_email, song_id,
     song_title_snapshot, artist_name_snapshot, amount_xaf, message, status)
  VALUES
    (v_sender, NULL, v_email_norm, p_song_id,
     v_song.title, v_song.artist_name, v_price, NULLIF(p_message, ''), 'pending_signup')
  RETURNING id INTO v_gift_id;

  -- Notificación al emisor
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_sender,
    'song_gift_pending',
    'Invitación enviada',
    'Hemos enviado una invitación a ' || v_email_norm || '. El regalo se entregará cuando se registre.',
    jsonb_build_object(
      'gift_id', v_gift_id,
      'song_id', p_song_id,
      'song_title', v_song.title,
      'recipient_email', v_email_norm
    )
  );

  RETURN QUERY SELECT true, 'pending_signup'::text,
    'El destinatario no está registrado. Recibirá un email y se le entregará al registrarse.'::text,
    v_gift_id, NULL::numeric, v_price;
END;
$$;

REVOKE ALL ON FUNCTION public.gift_song(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gift_song(uuid, uuid, text, text) TO authenticated, service_role;

-- ============================================================
-- 4) FUNCIÓN: claim_pending_song_gifts
--    Llamada al registrarse un usuario. Procesa todos los regalos
--    pending_signup para su email: cobra ahora al emisor (si tiene
--    saldo) y entrega la canción al nuevo usuario.
-- ============================================================
CREATE OR REPLACE FUNCTION public.claim_pending_song_gifts(p_user_id uuid, p_email text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      -- Marcar como failed (no hay saldo en el emisor)
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

    -- Crear descarga si no existe
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

    -- Notificar al destinatario
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

    -- Notificar al emisor
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
$$;

REVOKE ALL ON FUNCTION public.claim_pending_song_gifts(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_pending_song_gifts(uuid, text) TO authenticated, service_role;

-- ============================================================
-- 5) Trigger en profiles: cuando un usuario crea su perfil,
--    intentar canjear automáticamente regalos pendientes.
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_claim_gifts_on_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = NEW.user_id;
  IF v_email IS NOT NULL THEN
    PERFORM public.claim_pending_song_gifts(NEW.user_id, v_email);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_claim_gifts ON public.profiles;
CREATE TRIGGER trg_profiles_claim_gifts
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.trg_claim_gifts_on_profile();