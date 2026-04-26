-- =====================================================================
-- ENUMS
-- =====================================================================
CREATE TYPE public.artist_earning_status AS ENUM (
  'pending_validation',
  'available',
  'withdrawn',
  'blocked',
  'refunded',
  'under_review'
);

CREATE TYPE public.artist_withdrawal_status AS ENUM (
  'requested',
  'under_review',
  'approved',
  'paid',
  'rejected',
  'cancelled'
);

CREATE TYPE public.artist_payment_method_type AS ENUM (
  'bank_transfer',
  'mobile_money',
  'paypal',
  'other'
);

CREATE TYPE public.withdrawal_fee_type AS ENUM (
  'none',
  'fixed',
  'percent'
);

-- =====================================================================
-- admin_financial_settings (singleton)
-- =====================================================================
CREATE TABLE public.admin_financial_settings (
  id integer PRIMARY KEY DEFAULT 1,
  artist_percentage numeric(5,2) NOT NULL DEFAULT 30.00,
  platform_percentage numeric(5,2) NOT NULL DEFAULT 70.00,
  value_per_download_xaf integer NOT NULL DEFAULT 250,
  withdrawal_minimum_xaf integer NOT NULL DEFAULT 13000, -- ~20 EUR
  withdrawal_frequency_days integer NOT NULL DEFAULT 7,
  validation_period_days integer NOT NULL DEFAULT 14,
  withdrawal_fee_type public.withdrawal_fee_type NOT NULL DEFAULT 'percent',
  withdrawal_fee_value numeric(10,2) NOT NULL DEFAULT 2.00,
  auto_release_enabled boolean NOT NULL DEFAULT true,
  withdrawals_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT only_one_row CHECK (id = 1)
);

INSERT INTO public.admin_financial_settings (id) VALUES (1);

ALTER TABLE public.admin_financial_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage financial settings"
ON public.admin_financial_settings
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- =====================================================================
-- artist_earnings
-- =====================================================================
CREATE TABLE public.artist_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL,
  song_id uuid,
  source_download_id uuid UNIQUE,
  user_id uuid,
  qr_card_id uuid,
  gross_amount_xaf integer NOT NULL DEFAULT 0,
  artist_percentage numeric(5,2) NOT NULL,
  artist_amount_xaf integer NOT NULL DEFAULT 0,
  platform_amount_xaf integer NOT NULL DEFAULT 0,
  status public.artist_earning_status NOT NULL DEFAULT 'pending_validation',
  validation_release_date timestamptz NOT NULL,
  withdrawal_request_id uuid,
  fraud_score integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_artist_earnings_artist ON public.artist_earnings(artist_id);
CREATE INDEX idx_artist_earnings_status ON public.artist_earnings(status);
CREATE INDEX idx_artist_earnings_release ON public.artist_earnings(validation_release_date) WHERE status = 'pending_validation';
CREATE INDEX idx_artist_earnings_song ON public.artist_earnings(song_id);

ALTER TABLE public.artist_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all earnings"
ON public.artist_earnings
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Artists view their own earnings"
ON public.artist_earnings
FOR SELECT
TO authenticated
USING (public.user_owns_artist(auth.uid(), artist_id));

-- =====================================================================
-- artist_withdrawal_methods
-- =====================================================================
CREATE TABLE public.artist_withdrawal_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL,
  user_id uuid NOT NULL,
  method_type public.artist_payment_method_type NOT NULL,
  account_holder_name text NOT NULL,
  country text,
  payment_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  verification_status text NOT NULL DEFAULT 'unverified',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_withdrawal_methods_artist ON public.artist_withdrawal_methods(artist_id);

ALTER TABLE public.artist_withdrawal_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all methods"
ON public.artist_withdrawal_methods
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Artists view their own methods"
ON public.artist_withdrawal_methods
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.user_owns_artist(auth.uid(), artist_id));

CREATE POLICY "Artists insert their own methods"
ON public.artist_withdrawal_methods
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND public.user_owns_artist(auth.uid(), artist_id));

CREATE POLICY "Artists update their own methods"
ON public.artist_withdrawal_methods
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Artists delete their own methods"
ON public.artist_withdrawal_methods
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- =====================================================================
-- artist_withdrawal_requests
-- =====================================================================
CREATE TABLE public.artist_withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL,
  user_id uuid NOT NULL,
  amount_requested_xaf integer NOT NULL,
  fee_amount_xaf integer NOT NULL DEFAULT 0,
  net_amount_xaf integer NOT NULL,
  payment_method_id uuid REFERENCES public.artist_withdrawal_methods(id) ON DELETE SET NULL,
  payment_method_snapshot jsonb,
  status public.artist_withdrawal_status NOT NULL DEFAULT 'requested',
  rejection_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  paid_at timestamptz,
  paid_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_withdrawal_requests_artist ON public.artist_withdrawal_requests(artist_id);
CREATE INDEX idx_withdrawal_requests_status ON public.artist_withdrawal_requests(status);
CREATE INDEX idx_withdrawal_requests_created ON public.artist_withdrawal_requests(created_at DESC);

ALTER TABLE public.artist_withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all withdrawal requests"
ON public.artist_withdrawal_requests
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Artists view their own withdrawal requests"
ON public.artist_withdrawal_requests
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.user_owns_artist(auth.uid(), artist_id));

-- FK from artist_earnings to withdrawal request
ALTER TABLE public.artist_earnings
  ADD CONSTRAINT fk_earnings_withdrawal
  FOREIGN KEY (withdrawal_request_id)
  REFERENCES public.artist_withdrawal_requests(id)
  ON DELETE SET NULL;

-- =====================================================================
-- updated_at triggers
-- =====================================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_admin_financial_settings_updated
  BEFORE UPDATE ON public.admin_financial_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_artist_earnings_updated
  BEFORE UPDATE ON public.artist_earnings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_withdrawal_methods_updated
  BEFORE UPDATE ON public.artist_withdrawal_methods
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_withdrawal_requests_updated
  BEFORE UPDATE ON public.artist_withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =====================================================================
-- Auto-generate earning when a download is recorded
-- =====================================================================
CREATE OR REPLACE FUNCTION public.auto_create_artist_earning()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_artist_id uuid;
  v_settings public.admin_financial_settings%ROWTYPE;
  v_gross integer;
  v_artist_amount integer;
  v_platform_amount integer;
BEGIN
  -- Skip fake/test downloads
  IF NEW.download_type IS DISTINCT FROM 'real' THEN
    RETURN NEW;
  END IF;

  -- Get settings
  SELECT * INTO v_settings FROM public.admin_financial_settings WHERE id = 1;
  IF v_settings IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get artist for this song
  SELECT artist_id INTO v_artist_id FROM public.songs WHERE id = NEW.song_id;
  IF v_artist_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_gross := v_settings.value_per_download_xaf;
  v_artist_amount := ROUND(v_gross * v_settings.artist_percentage / 100.0);
  v_platform_amount := v_gross - v_artist_amount;

  INSERT INTO public.artist_earnings (
    artist_id, song_id, source_download_id, user_id, qr_card_id,
    gross_amount_xaf, artist_percentage, artist_amount_xaf, platform_amount_xaf,
    status, validation_release_date
  ) VALUES (
    v_artist_id, NEW.song_id, NEW.id, NEW.user_id, NEW.qr_card_id,
    v_gross, v_settings.artist_percentage, v_artist_amount, v_platform_amount,
    'pending_validation', NEW.downloaded_at + (v_settings.validation_period_days || ' days')::interval
  )
  ON CONFLICT (source_download_id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the download itself
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_create_artist_earning
  AFTER INSERT ON public.user_downloads
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_artist_earning();

-- =====================================================================
-- release_pending_earnings (cron-friendly)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.release_pending_earnings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_enabled boolean;
BEGIN
  SELECT auto_release_enabled INTO v_enabled FROM public.admin_financial_settings WHERE id = 1;
  IF NOT COALESCE(v_enabled, true) THEN
    RETURN 0;
  END IF;

  WITH released AS (
    UPDATE public.artist_earnings
    SET status = 'available'
    WHERE status = 'pending_validation'
      AND validation_release_date <= now()
    RETURNING 1
  )
  SELECT count(*)::int INTO v_count FROM released;
  RETURN v_count;
END;
$$;

-- =====================================================================
-- get_artist_wallet_summary
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_artist_wallet_summary(p_artist_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_can_view boolean;
BEGIN
  v_can_view := public.is_admin(auth.uid()) OR public.user_owns_artist(auth.uid(), p_artist_id);
  IF NOT v_can_view THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  -- Auto release pending if needed
  PERFORM public.release_pending_earnings();

  SELECT jsonb_build_object(
    'pending_xaf', COALESCE(SUM(artist_amount_xaf) FILTER (WHERE status = 'pending_validation'), 0),
    'available_xaf', COALESCE(SUM(artist_amount_xaf) FILTER (WHERE status = 'available'), 0),
    'under_review_xaf', COALESCE(SUM(artist_amount_xaf) FILTER (WHERE status = 'under_review'), 0),
    'blocked_xaf', COALESCE(SUM(artist_amount_xaf) FILTER (WHERE status = 'blocked'), 0),
    'withdrawn_xaf', COALESCE(SUM(artist_amount_xaf) FILTER (WHERE status = 'withdrawn'), 0),
    'gross_total_xaf', COALESCE(SUM(artist_amount_xaf), 0),
    'reserved_xaf', COALESCE((
      SELECT SUM(amount_requested_xaf)
      FROM public.artist_withdrawal_requests
      WHERE artist_id = p_artist_id
        AND status IN ('requested','under_review','approved')
    ), 0),
    'earnings_count', count(*)
  ) INTO v_result
  FROM public.artist_earnings
  WHERE artist_id = p_artist_id;

  RETURN v_result;
END;
$$;

-- =====================================================================
-- get_public_financial_settings (for artists to see rules)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_public_financial_settings()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'artist_percentage', artist_percentage,
    'value_per_download_xaf', value_per_download_xaf,
    'withdrawal_minimum_xaf', withdrawal_minimum_xaf,
    'withdrawal_frequency_days', withdrawal_frequency_days,
    'validation_period_days', validation_period_days,
    'withdrawal_fee_type', withdrawal_fee_type,
    'withdrawal_fee_value', withdrawal_fee_value,
    'withdrawals_enabled', withdrawals_enabled
  )
  FROM public.admin_financial_settings WHERE id = 1;
$$;

-- =====================================================================
-- request_artist_withdrawal
-- =====================================================================
CREATE OR REPLACE FUNCTION public.request_artist_withdrawal(
  p_artist_id uuid,
  p_amount_xaf integer,
  p_method_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  -- Authorization
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

  -- Method
  SELECT * INTO v_method FROM public.artist_withdrawal_methods WHERE id = p_method_id;
  IF v_method IS NULL OR v_method.artist_id <> p_artist_id THEN
    RAISE EXCEPTION 'invalid_method';
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

  -- Refresh + balances
  PERFORM public.release_pending_earnings();

  SELECT public.get_artist_wallet_summary(p_artist_id) INTO v_summary;
  v_available := (v_summary->>'available_xaf')::integer;
  v_reserved := (v_summary->>'reserved_xaf')::integer;
  v_truly_available := v_available - v_reserved;

  IF p_amount_xaf > v_truly_available THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  -- Block if any earnings under review
  IF EXISTS (SELECT 1 FROM public.artist_earnings WHERE artist_id = p_artist_id AND status = 'under_review') THEN
    RAISE EXCEPTION 'earnings_under_review';
  END IF;

  -- Compute fee
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

  RETURN jsonb_build_object('success', true, 'request_id', v_request_id);
END;
$$;

-- =====================================================================
-- Admin actions: approve / pay / reject
-- =====================================================================
CREATE OR REPLACE FUNCTION public.admin_approve_withdrawal(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'not_authorized'; END IF;

  UPDATE public.artist_withdrawal_requests
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = p_request_id AND status IN ('requested','under_review');

  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_state'; END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_mark_withdrawal_paid(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Consume earnings: mark oldest 'available' as 'withdrawn' until we cover the requested amount
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
  SET status = 'paid', paid_at = now(), paid_by = auth.uid()
  WHERE id = p_request_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_withdrawal(p_request_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'reason_required';
  END IF;

  UPDATE public.artist_withdrawal_requests
  SET status = 'rejected', rejection_reason = p_reason, reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = p_request_id AND status IN ('requested','under_review','approved');

  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_state'; END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- =====================================================================
-- sync_historical_earnings (admin tool)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.sync_historical_earnings(p_dry_run boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings public.admin_financial_settings%ROWTYPE;
  v_total_downloads integer := 0;
  v_to_create integer := 0;
  v_skipped integer := 0;
  v_inserted integer := 0;
  v_total_artist_xaf bigint := 0;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'not_authorized'; END IF;

  SELECT * INTO v_settings FROM public.admin_financial_settings WHERE id = 1;

  -- Count downloads
  SELECT count(*) INTO v_total_downloads FROM public.user_downloads WHERE download_type = 'real';

  -- Compute candidates
  WITH candidates AS (
    SELECT d.id AS download_id, d.song_id, d.user_id, d.qr_card_id, d.downloaded_at, s.artist_id
    FROM public.user_downloads d
    JOIN public.songs s ON s.id = d.song_id
    WHERE d.download_type = 'real'
      AND s.artist_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.artist_earnings e WHERE e.source_download_id = d.id)
  )
  SELECT count(*),
         SUM(ROUND(v_settings.value_per_download_xaf * v_settings.artist_percentage / 100.0))
  INTO v_to_create, v_total_artist_xaf
  FROM candidates;

  v_skipped := v_total_downloads - v_to_create;

  IF p_dry_run THEN
    RETURN jsonb_build_object(
      'dry_run', true,
      'total_downloads', v_total_downloads,
      'will_create', v_to_create,
      'skipped', v_skipped,
      'estimated_artist_xaf_total', COALESCE(v_total_artist_xaf, 0)
    );
  END IF;

  INSERT INTO public.artist_earnings (
    artist_id, song_id, source_download_id, user_id, qr_card_id,
    gross_amount_xaf, artist_percentage, artist_amount_xaf, platform_amount_xaf,
    status, validation_release_date, created_at
  )
  SELECT
    s.artist_id,
    d.song_id,
    d.id,
    d.user_id,
    d.qr_card_id,
    v_settings.value_per_download_xaf,
    v_settings.artist_percentage,
    ROUND(v_settings.value_per_download_xaf * v_settings.artist_percentage / 100.0)::int,
    v_settings.value_per_download_xaf - ROUND(v_settings.value_per_download_xaf * v_settings.artist_percentage / 100.0)::int,
    CASE
      WHEN d.downloaded_at + (v_settings.validation_period_days || ' days')::interval <= now()
        THEN 'available'::artist_earning_status
      ELSE 'pending_validation'::artist_earning_status
    END,
    d.downloaded_at + (v_settings.validation_period_days || ' days')::interval,
    d.downloaded_at
  FROM public.user_downloads d
  JOIN public.songs s ON s.id = d.song_id
  WHERE d.download_type = 'real'
    AND s.artist_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.artist_earnings e WHERE e.source_download_id = d.id);

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  RETURN jsonb_build_object(
    'dry_run', false,
    'total_downloads', v_total_downloads,
    'inserted', v_inserted,
    'skipped', v_skipped,
    'estimated_artist_xaf_total', COALESCE(v_total_artist_xaf, 0)
  );
END;
$$;