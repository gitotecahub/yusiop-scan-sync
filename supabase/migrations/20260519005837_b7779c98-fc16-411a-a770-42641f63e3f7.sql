
-- Tabla de prepagos: el artista paga ANTES de subir los archivos.
-- Una vez pagada, la fila se "consume" al crear las submissions/campaña reales.
CREATE TYPE public.submission_prepayment_status AS ENUM ('pending','paid','used','expired','cancelled');

CREATE TABLE public.submission_prepayments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('single','album')),
  status public.submission_prepayment_status NOT NULL DEFAULT 'pending',

  -- Express
  express_tier text CHECK (express_tier IN ('72h','48h','24h')),
  express_price_xaf integer NOT NULL DEFAULT 0,

  -- Promoción (banner home)
  promo_plan text CHECK (promo_plan IN ('basic','boost','featured')),
  promo_price_eur numeric(10,2) NOT NULL DEFAULT 0,
  promo_ad_text text,
  promo_cta_text text,
  promo_start_date date,

  -- Contexto opcional (para el ticket de Stripe)
  context_title text,
  context_artist_name text,

  -- Stripe
  stripe_session_id text,
  stripe_payment_intent text,

  paid_at timestamptz,
  used_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_submission_prepayments_user_status
  ON public.submission_prepayments(user_id, status);

ALTER TABLE public.submission_prepayments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view their prepayments"
  ON public.submission_prepayments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Admins manage prepayments"
  ON public.submission_prepayments FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Trigger updated_at
CREATE TRIGGER trg_submission_prepayments_updated_at
BEFORE UPDATE ON public.submission_prepayments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RPC: consumir prepayment al enviar definitivamente.
-- Marca las submissions como Express pagado y la campaña como pagada/aprobada.
CREATE OR REPLACE FUNCTION public.consume_submission_prepayment(
  p_prepayment_id uuid,
  p_submission_ids uuid[],
  p_campaign_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_pp public.submission_prepayments%ROWTYPE;
  v_now timestamptz := now();
  v_end timestamptz;
  v_days int;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT * INTO v_pp FROM public.submission_prepayments
   WHERE id = p_prepayment_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prepayment no encontrado';
  END IF;
  IF v_pp.user_id <> v_user THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF v_pp.status <> 'paid' THEN
    RAISE EXCEPTION 'Prepayment no está pagado (estado: %)', v_pp.status;
  END IF;

  -- Express: marcar pagado en las submissions del usuario indicadas
  IF v_pp.express_tier IS NOT NULL AND array_length(p_submission_ids, 1) > 0 THEN
    UPDATE public.song_submissions
       SET express_paid_at = v_now,
           express_tier = v_pp.express_tier,
           status = CASE WHEN status = 'pending_payment' THEN 'pending'::song_submission_status ELSE status END
     WHERE id = ANY(p_submission_ids)
       AND user_id = v_user;
  END IF;

  -- Promoción: marcar campaña como pagada + en revisión
  IF v_pp.promo_plan IS NOT NULL AND p_campaign_id IS NOT NULL THEN
    v_days := CASE v_pp.promo_plan
      WHEN 'basic' THEN 1
      WHEN 'boost' THEN 3
      WHEN 'featured' THEN 7
      ELSE 1 END;
    v_end := v_now + (v_days || ' days')::interval;
    UPDATE public.ad_campaigns
       SET payment_status = 'paid',
           status = 'pending_review',
           start_date = COALESCE(start_date, v_now),
           end_date = v_end,
           payment_reference = COALESCE(payment_reference, v_pp.stripe_payment_intent, v_pp.stripe_session_id)
     WHERE id = p_campaign_id
       AND user_id = v_user;
  END IF;

  -- Marcar prepayment como consumido
  UPDATE public.submission_prepayments
     SET status = 'used', used_at = v_now
   WHERE id = p_prepayment_id;

  RETURN jsonb_build_object(
    'ok', true,
    'express_applied', v_pp.express_tier IS NOT NULL,
    'promo_applied', v_pp.promo_plan IS NOT NULL AND p_campaign_id IS NOT NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_submission_prepayment(uuid, uuid[], uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.consume_submission_prepayment(uuid, uuid[], uuid) TO authenticated;
