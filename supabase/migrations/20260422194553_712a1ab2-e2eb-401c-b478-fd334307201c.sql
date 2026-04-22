-- ============================================================
-- FASE 1: Sistema de tarjetas digitales (compra + regalo)
-- ============================================================

-- 1) Enum para origen de la tarjeta
DO $$ BEGIN
  CREATE TYPE public.card_origin AS ENUM ('physical', 'digital');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Enum para estado de compra
DO $$ BEGIN
  CREATE TYPE public.purchase_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) Extender qr_cards para soportar tarjetas digitales y regalo
ALTER TABLE public.qr_cards
  ADD COLUMN IF NOT EXISTS origin public.card_origin NOT NULL DEFAULT 'physical',
  ADD COLUMN IF NOT EXISTS owner_user_id uuid,
  ADD COLUMN IF NOT EXISTS purchase_id uuid,
  ADD COLUMN IF NOT EXISTS is_gift boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gift_recipient_email text,
  ADD COLUMN IF NOT EXISTS gift_message text,
  ADD COLUMN IF NOT EXISTS gift_redeemed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gift_redeemed_at timestamptz,
  ADD COLUMN IF NOT EXISTS redemption_token text,
  ADD COLUMN IF NOT EXISTS price_cents integer,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'EUR';

CREATE UNIQUE INDEX IF NOT EXISTS qr_cards_redemption_token_uidx
  ON public.qr_cards(redemption_token) WHERE redemption_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS qr_cards_owner_idx ON public.qr_cards(owner_user_id);

-- 4) Tabla de compras (registro Stripe)
CREATE TABLE IF NOT EXISTS public.card_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_user_id uuid NOT NULL,
  buyer_email text NOT NULL,
  card_type public.card_type NOT NULL,
  download_credits integer NOT NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  status public.purchase_status NOT NULL DEFAULT 'pending',
  is_gift boolean NOT NULL DEFAULT false,
  gift_recipient_email text,
  gift_message text,
  stripe_session_id text UNIQUE,
  stripe_payment_intent text,
  qr_card_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS card_purchases_buyer_idx ON public.card_purchases(buyer_user_id);
CREATE INDEX IF NOT EXISTS card_purchases_status_idx ON public.card_purchases(status);

ALTER TABLE public.card_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view their own purchases" ON public.card_purchases;
CREATE POLICY "Users view their own purchases"
  ON public.card_purchases FOR SELECT
  USING (auth.uid() = buyer_user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage purchases" ON public.card_purchases;
CREATE POLICY "Admins manage purchases"
  ON public.card_purchases FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 5) Tabla de auditoría de canjes de regalo
CREATE TABLE IF NOT EXISTS public.gift_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_card_id uuid NOT NULL,
  redeemed_by_user_id uuid NOT NULL,
  redeemed_by_email text NOT NULL,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  ip_address text
);

ALTER TABLE public.gift_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view their own redemptions" ON public.gift_redemptions;
CREATE POLICY "Users view their own redemptions"
  ON public.gift_redemptions FOR SELECT
  USING (auth.uid() = redeemed_by_user_id OR public.is_admin(auth.uid()));

-- 6) Actualizar RLS de qr_cards para que el dueño vea su tarjeta digital
DROP POLICY IF EXISTS "Owners can view their digital cards" ON public.qr_cards;
CREATE POLICY "Owners can view their digital cards"
  ON public.qr_cards FOR SELECT
  USING (
    owner_user_id = auth.uid()
    OR activated_by = auth.uid()
    OR public.is_admin(auth.uid())
  );

-- 7) Trigger updated_at en card_purchases
DROP TRIGGER IF EXISTS trg_card_purchases_updated_at ON public.card_purchases;
CREATE TRIGGER trg_card_purchases_updated_at
  BEFORE UPDATE ON public.card_purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8) Función segura para canjear regalo (transfiere propiedad atómicamente)
CREATE OR REPLACE FUNCTION public.redeem_gift_card(
  p_token text,
  p_user_id uuid,
  p_user_email text
)
RETURNS TABLE (
  success boolean,
  message text,
  card_id uuid,
  card_type public.card_type,
  download_credits integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card public.qr_cards%ROWTYPE;
BEGIN
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
$$;

-- 9) Función segura para consumir crédito en una descarga
CREATE OR REPLACE FUNCTION public.consume_card_credit(
  p_card_id uuid,
  p_user_id uuid,
  p_song_id uuid
)
RETURNS TABLE (success boolean, message text, credits_left integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card public.qr_cards%ROWTYPE;
BEGIN
  SELECT * INTO v_card
  FROM public.qr_cards
  WHERE id = p_card_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Tarjeta no encontrada'::text, 0;
    RETURN;
  END IF;

  IF v_card.owner_user_id IS DISTINCT FROM p_user_id
     AND v_card.activated_by IS DISTINCT FROM p_user_id THEN
    RETURN QUERY SELECT false, 'No eres el propietario de esta tarjeta'::text, 0;
    RETURN;
  END IF;

  IF v_card.download_credits <= 0 THEN
    RETURN QUERY SELECT false, 'Sin descargas disponibles en esta tarjeta'::text, 0;
    RETURN;
  END IF;

  UPDATE public.qr_cards
  SET download_credits = download_credits - 1
  WHERE id = v_card.id;

  INSERT INTO public.user_downloads (user_id, song_id, qr_card_id, user_email)
  VALUES (p_user_id, p_song_id, v_card.id, (SELECT email FROM auth.users WHERE id = p_user_id));

  RETURN QUERY SELECT true, 'Crédito consumido'::text, v_card.download_credits - 1;
END;
$$;