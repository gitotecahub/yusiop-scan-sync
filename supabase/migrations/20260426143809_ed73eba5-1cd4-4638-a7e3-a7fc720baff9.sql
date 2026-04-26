
-- 1) Add new enum values to artist_payment_method_type
ALTER TYPE public.artist_payment_method_type ADD VALUE IF NOT EXISTS 'crypto';
ALTER TYPE public.artist_payment_method_type ADD VALUE IF NOT EXISTS 'manual_other';

-- 2) Add columns to artist_withdrawal_methods
ALTER TABLE public.artist_withdrawal_methods
  ADD COLUMN IF NOT EXISTS details_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS last_used_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

-- Backfill: copy existing payment_details to details_json if empty
UPDATE public.artist_withdrawal_methods
SET details_json = payment_details
WHERE details_json = '{}'::jsonb AND payment_details IS NOT NULL AND payment_details <> '{}'::jsonb;

-- Convert existing methods (which were 'unverified') to 'pending_verification'
UPDATE public.artist_withdrawal_methods
SET verification_status = 'pending_verification'
WHERE verification_status NOT IN ('pending_verification','verified','rejected','disabled');

-- Add CHECK constraint for verification_status values
ALTER TABLE public.artist_withdrawal_methods
  DROP CONSTRAINT IF EXISTS artist_withdrawal_methods_verification_status_check;
ALTER TABLE public.artist_withdrawal_methods
  ADD CONSTRAINT artist_withdrawal_methods_verification_status_check
  CHECK (verification_status IN ('pending_verification','verified','rejected','disabled'));

ALTER TABLE public.artist_withdrawal_methods
  ALTER COLUMN verification_status SET DEFAULT 'pending_verification';

-- 3) Tighten RLS so artists CANNOT change verification_status / verified_by / rejection_reason themselves
DROP POLICY IF EXISTS "Artists update their own methods" ON public.artist_withdrawal_methods;
CREATE POLICY "Artists update their own methods"
  ON public.artist_withdrawal_methods
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND verification_status = (
      SELECT verification_status FROM public.artist_withdrawal_methods m WHERE m.id = artist_withdrawal_methods.id
    )
  );

-- 4) Trigger to prevent deletion of methods with active withdrawal requests
CREATE OR REPLACE FUNCTION public.prevent_method_delete_if_active_withdrawals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.artist_withdrawal_requests
    WHERE payment_method_id = OLD.id
      AND status IN ('requested','under_review','approved')
  ) THEN
    RAISE EXCEPTION 'method_has_active_withdrawals';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_method_delete ON public.artist_withdrawal_methods;
CREATE TRIGGER trg_prevent_method_delete
  BEFORE DELETE ON public.artist_withdrawal_methods
  FOR EACH ROW EXECUTE FUNCTION public.prevent_method_delete_if_active_withdrawals();

-- 5) Trigger: only one default method per artist
CREATE OR REPLACE FUNCTION public.enforce_single_default_method()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default IS TRUE THEN
    UPDATE public.artist_withdrawal_methods
    SET is_default = false
    WHERE artist_id = NEW.artist_id AND id <> NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_single_default_method ON public.artist_withdrawal_methods;
CREATE TRIGGER trg_single_default_method
  AFTER INSERT OR UPDATE OF is_default ON public.artist_withdrawal_methods
  FOR EACH ROW
  WHEN (NEW.is_default IS TRUE)
  EXECUTE FUNCTION public.enforce_single_default_method();

-- 6) Add columns to artist_withdrawal_requests
ALTER TABLE public.artist_withdrawal_requests
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS payment_proof_url text,
  ADD COLUMN IF NOT EXISTS admin_internal_note text;

-- 7) Update request_artist_withdrawal: only verified methods, more checks
CREATE OR REPLACE FUNCTION public.request_artist_withdrawal(p_artist_id uuid, p_amount_xaf integer, p_method_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_settings public.admin_financial_settings%ROWTYPE;
  v_method public.artist_withdrawal_methods%ROWTYPE;
  v_summary jsonb;
  v_available integer;
  v_reserved integer;
  v_truly_available integer;
  v_last_request_at timestamptz;
  v_fee integer := 0;
  v_net integer;
  v_request_id uuid;
BEGIN
  IF NOT public.user_owns_artist(auth.uid(), p_artist_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT * INTO v_settings FROM public.admin_financial_settings WHERE id = 1;
  IF NOT v_settings.withdrawals_enabled THEN
    RAISE EXCEPTION 'withdrawals_disabled';
  END IF;

  IF p_amount_xaf < v_settings.withdrawal_minimum_xaf THEN
    RAISE EXCEPTION 'amount_below_minimum';
  END IF;

  -- Method must exist, belong to artist AND be verified
  SELECT * INTO v_method FROM public.artist_withdrawal_methods WHERE id = p_method_id;
  IF v_method IS NULL OR v_method.artist_id <> p_artist_id THEN
    RAISE EXCEPTION 'invalid_method';
  END IF;
  IF v_method.verification_status <> 'verified' THEN
    RAISE EXCEPTION 'method_not_verified';
  END IF;

  -- Frequency check
  SELECT MAX(created_at) INTO v_last_request_at
  FROM public.artist_withdrawal_requests
  WHERE artist_id = p_artist_id
    AND status NOT IN ('rejected','cancelled');
  IF v_last_request_at IS NOT NULL
     AND v_last_request_at + (v_settings.withdrawal_frequency_days || ' days')::interval > now() THEN
    RAISE EXCEPTION 'frequency_limit';
  END IF;

  PERFORM public.release_pending_earnings();

  SELECT public.get_artist_wallet_summary(p_artist_id) INTO v_summary;
  v_available := (v_summary->>'available_xaf')::integer;
  v_reserved := (v_summary->>'reserved_xaf')::integer;
  v_truly_available := v_available - v_reserved;

  IF p_amount_xaf > v_truly_available THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  IF EXISTS (SELECT 1 FROM public.artist_earnings WHERE artist_id = p_artist_id AND status = 'under_review') THEN
    RAISE EXCEPTION 'earnings_under_review';
  END IF;

  IF v_settings.withdrawal_fee_type = 'fixed' THEN
    v_fee := ROUND(v_settings.withdrawal_fee_value);
  ELSIF v_settings.withdrawal_fee_type = 'percent' THEN
    v_fee := ROUND(p_amount_xaf * v_settings.withdrawal_fee_value / 100.0);
  END IF;
  v_net := p_amount_xaf - v_fee;

  INSERT INTO public.artist_withdrawal_requests (
    artist_id, user_id, amount_requested_xaf, fee_amount_xaf, net_amount_xaf,
    payment_method_id, payment_method_snapshot, status
  ) VALUES (
    p_artist_id, auth.uid(), p_amount_xaf, v_fee, v_net,
    p_method_id, to_jsonb(v_method), 'requested'
  )
  RETURNING id INTO v_request_id;

  -- Update last_used_at
  UPDATE public.artist_withdrawal_methods SET last_used_at = now() WHERE id = p_method_id;

  -- Notify artist
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    auth.uid(),
    'withdrawal_requested',
    'Solicitud de retiro enviada',
    'Tu solicitud por ' || p_amount_xaf::text || ' XAF está siendo revisada por el equipo financiero de YUSIOP.',
    jsonb_build_object('request_id', v_request_id, 'amount_xaf', p_amount_xaf)
  );

  -- Notify admins
  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT ur.user_id, 'admin_withdrawal_new',
         'Nueva solicitud de retiro',
         'Un artista ha solicitado un retiro de ' || p_amount_xaf::text || ' XAF (' || v_method.method_type::text || ').',
         jsonb_build_object('request_id', v_request_id, 'artist_id', p_artist_id, 'method_type', v_method.method_type::text)
  FROM public.user_roles ur WHERE ur.role = 'admin';

  RETURN jsonb_build_object('success', true, 'request_id', v_request_id);
END;
$function$;

-- 8) Admin functions to verify / reject / disable / reactivate methods
CREATE OR REPLACE FUNCTION public.admin_set_method_status(
  p_method_id uuid,
  p_status text,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_method public.artist_withdrawal_methods%ROWTYPE;
  v_title text;
  v_body text;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'not_authorized'; END IF;

  IF p_status NOT IN ('pending_verification','verified','rejected','disabled') THEN
    RAISE EXCEPTION 'invalid_status';
  END IF;

  IF p_status = 'rejected' AND (p_reason IS NULL OR length(trim(p_reason)) = 0) THEN
    RAISE EXCEPTION 'reason_required';
  END IF;

  SELECT * INTO v_method FROM public.artist_withdrawal_methods WHERE id = p_method_id;
  IF v_method IS NULL THEN RAISE EXCEPTION 'method_not_found'; END IF;

  UPDATE public.artist_withdrawal_methods
  SET verification_status = p_status,
      rejection_reason = CASE WHEN p_status = 'rejected' THEN p_reason ELSE NULL END,
      verified_by = CASE WHEN p_status = 'verified' THEN auth.uid() ELSE NULL END,
      verified_at = CASE WHEN p_status = 'verified' THEN now() ELSE NULL END,
      updated_at = now()
  WHERE id = p_method_id;

  IF p_status = 'verified' THEN
    v_title := 'Método de cobro verificado';
    v_body := 'Tu método de cobro ha sido aprobado por YUSIOP. Ya puedes usarlo para solicitar retiros.';
  ELSIF p_status = 'rejected' THEN
    v_title := 'Método de cobro rechazado';
    v_body := 'Tu método de cobro fue rechazado. Motivo: ' || p_reason;
  ELSIF p_status = 'disabled' THEN
    v_title := 'Método de cobro deshabilitado';
    v_body := 'YUSIOP ha deshabilitado tu método de cobro. Contacta con soporte si lo necesitas.';
  ELSE
    v_title := 'Método marcado como pendiente';
    v_body := 'Tu método de cobro vuelve a estar pendiente de verificación.';
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (v_method.user_id, 'withdrawal_method_status', v_title, v_body,
          jsonb_build_object('method_id', p_method_id, 'status', p_status));

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 9) Admin: mark withdrawal paid with payment metadata
CREATE OR REPLACE FUNCTION public.admin_mark_withdrawal_paid(
  p_request_id uuid,
  p_payment_reference text DEFAULT NULL,
  p_payment_proof_url text DEFAULT NULL,
  p_admin_internal_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_req public.artist_withdrawal_requests%ROWTYPE;
  v_remaining integer;
  v_earning record;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'not_authorized'; END IF;

  SELECT * INTO v_req FROM public.artist_withdrawal_requests WHERE id = p_request_id FOR UPDATE;
  IF v_req IS NULL OR v_req.status <> 'approved' THEN
    RAISE EXCEPTION 'invalid_state';
  END IF;

  v_remaining := v_req.amount_requested_xaf;
  FOR v_earning IN
    SELECT id, artist_amount_xaf
    FROM public.artist_earnings
    WHERE artist_id = v_req.artist_id AND status = 'available'
    ORDER BY created_at ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining <= 0;
    UPDATE public.artist_earnings
    SET status = 'withdrawn', withdrawal_request_id = p_request_id
    WHERE id = v_earning.id;
    v_remaining := v_remaining - v_earning.artist_amount_xaf;
  END LOOP;

  IF v_remaining > 0 THEN
    RAISE EXCEPTION 'insufficient_available_earnings';
  END IF;

  UPDATE public.artist_withdrawal_requests
  SET status = 'paid',
      paid_at = now(),
      paid_by = auth.uid(),
      payment_reference = COALESCE(p_payment_reference, payment_reference),
      payment_proof_url = COALESCE(p_payment_proof_url, payment_proof_url),
      admin_internal_note = COALESCE(p_admin_internal_note, admin_internal_note)
  WHERE id = p_request_id;

  -- Notify artist
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_req.user_id,
    'withdrawal_paid',
    'Retiro pagado',
    'Tu retiro de ' || v_req.net_amount_xaf::text || ' XAF ha sido marcado como pagado por YUSIOP.',
    jsonb_build_object('request_id', p_request_id)
  );

  RETURN jsonb_build_object('success', true);
END;
$function$;

-- 10) Wrap admin_approve / admin_reject to send notifications
CREATE OR REPLACE FUNCTION public.admin_approve_withdrawal(p_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_req public.artist_withdrawal_requests%ROWTYPE;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'not_authorized'; END IF;

  UPDATE public.artist_withdrawal_requests
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = p_request_id AND status IN ('requested','under_review')
  RETURNING * INTO v_req;

  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_state'; END IF;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (v_req.user_id, 'withdrawal_approved', 'Retiro aprobado',
          'Tu solicitud por ' || v_req.amount_requested_xaf::text || ' XAF fue aprobada y será pagada en breve.',
          jsonb_build_object('request_id', p_request_id));

  RETURN jsonb_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_reject_withdrawal(p_request_id uuid, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_req public.artist_withdrawal_requests%ROWTYPE;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN RAISE EXCEPTION 'reason_required'; END IF;

  UPDATE public.artist_withdrawal_requests
  SET status = 'rejected', rejection_reason = p_reason, reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = p_request_id AND status IN ('requested','under_review','approved')
  RETURNING * INTO v_req;

  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_state'; END IF;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (v_req.user_id, 'withdrawal_rejected', 'Retiro rechazado',
          'Tu solicitud fue rechazada. Motivo: ' || p_reason,
          jsonb_build_object('request_id', p_request_id, 'reason', p_reason));

  RETURN jsonb_build_object('success', true);
END;
$function$;

-- 11) Notify admins when artist creates a method
CREATE OR REPLACE FUNCTION public.notify_admins_method_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Notify the artist
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (NEW.user_id, 'withdrawal_method_added',
          'Método de cobro añadido',
          'Tu nuevo método ha sido registrado y está pendiente de verificación por YUSIOP.',
          jsonb_build_object('method_id', NEW.id, 'method_type', NEW.method_type::text));

  -- Notify admins
  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT ur.user_id, 'admin_method_pending',
         'Nuevo método de cobro pendiente',
         'Un artista ha registrado un método de tipo ' || NEW.method_type::text || ' que requiere verificación.',
         jsonb_build_object('method_id', NEW.id, 'artist_id', NEW.artist_id, 'method_type', NEW.method_type::text)
  FROM public.user_roles ur WHERE ur.role = 'admin';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_method_created ON public.artist_withdrawal_methods;
CREATE TRIGGER trg_notify_method_created
  AFTER INSERT ON public.artist_withdrawal_methods
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_method_created();

-- 12) Storage buckets (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('artist-kyc', 'artist-kyc', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('withdrawal-proofs', 'withdrawal-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for artist-kyc: artists upload to their own folder; admin sees all
DROP POLICY IF EXISTS "Artists upload their KYC files" ON storage.objects;
CREATE POLICY "Artists upload their KYC files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'artist-kyc'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Artists read their own KYC files" ON storage.objects;
CREATE POLICY "Artists read their own KYC files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'artist-kyc'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin(auth.uid()))
  );

DROP POLICY IF EXISTS "Artists delete their own KYC files" ON storage.objects;
CREATE POLICY "Artists delete their own KYC files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'artist-kyc'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin(auth.uid()))
  );

-- Storage policies for withdrawal-proofs: only admin
DROP POLICY IF EXISTS "Admins manage withdrawal proofs" ON storage.objects;
CREATE POLICY "Admins manage withdrawal proofs"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'withdrawal-proofs' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'withdrawal-proofs' AND public.is_admin(auth.uid()));
