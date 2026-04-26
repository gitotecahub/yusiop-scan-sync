-- =========================================================
-- 1. Storage bucket for ad assets
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('ad-assets', 'ad-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "Ad assets are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'ad-assets');

-- Authenticated users can upload to their own folder
CREATE POLICY "Authenticated can upload ad assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ad-assets');

-- Owners or admins can update / delete
CREATE POLICY "Owners or admins can update ad assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'ad-assets' AND (auth.uid()::text = (storage.foldername(name))[1] OR is_admin(auth.uid())));

CREATE POLICY "Owners or admins can delete ad assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'ad-assets' AND (auth.uid()::text = (storage.foldername(name))[1] OR is_admin(auth.uid())));

-- =========================================================
-- 2. Enums
-- =========================================================
DO $$ BEGIN
  CREATE TYPE public.ad_campaign_type AS ENUM ('artist_release', 'external_business', 'yusiop_service');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ad_campaign_status AS ENUM ('draft', 'pending_payment', 'pending_review', 'active', 'rejected', 'expired', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ad_payment_status AS ENUM ('unpaid', 'paid', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ad_request_status AS ENUM ('new', 'contacted', 'proposal_sent', 'converted', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================
-- 3. ad_campaigns table
-- =========================================================
CREATE TABLE public.ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  artist_id uuid,
  title text NOT NULL,
  subtitle text,
  image_url text,
  cta_text text,
  cta_url text,
  campaign_type public.ad_campaign_type NOT NULL,
  placement text NOT NULL DEFAULT 'home_top_banner',
  status public.ad_campaign_status NOT NULL DEFAULT 'draft',
  start_date timestamptz,
  end_date timestamptz,
  duration_days integer,
  price_xaf numeric DEFAULT 0,
  price_eur numeric DEFAULT 0,
  payment_status public.ad_payment_status NOT NULL DEFAULT 'unpaid',
  payment_reference text,
  priority integer NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  rejection_reason text,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ad_campaigns_status ON public.ad_campaigns(status);
CREATE INDEX idx_ad_campaigns_dates ON public.ad_campaigns(start_date, end_date);
CREATE INDEX idx_ad_campaigns_artist ON public.ad_campaigns(artist_id);
CREATE INDEX idx_ad_campaigns_user ON public.ad_campaigns(user_id);

ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;

-- Anyone (anon + auth) can read currently active campaigns
CREATE POLICY "Anyone can view active ad campaigns"
ON public.ad_campaigns FOR SELECT
USING (
  status = 'active'
  AND (payment_status = 'paid' OR campaign_type = 'yusiop_service')
  AND (start_date IS NULL OR start_date <= now())
  AND (end_date IS NULL OR end_date >= now())
);

-- Owners (artist user or user_id) can view their own campaigns
CREATE POLICY "Owners view their own campaigns"
ON public.ad_campaigns FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR (artist_id IS NOT NULL AND user_owns_artist(auth.uid(), artist_id))
);

-- Owners can insert their own draft campaigns
CREATE POLICY "Owners insert own campaigns"
ON public.ad_campaigns FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND campaign_type = 'artist_release'
  AND (artist_id IS NULL OR user_owns_artist(auth.uid(), artist_id))
);

-- Owners update their own draft / pending_payment campaigns
CREATE POLICY "Owners update their draft campaigns"
ON public.ad_campaigns FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND status IN ('draft','pending_payment','rejected'))
WITH CHECK (user_id = auth.uid() AND status IN ('draft','pending_payment','rejected'));

-- Admins manage everything
CREATE POLICY "Admins manage ad campaigns"
ON public.ad_campaigns FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- updated_at trigger
CREATE TRIGGER trg_ad_campaigns_updated_at
BEFORE UPDATE ON public.ad_campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 4. ad_requests table
-- =========================================================
CREATE TABLE public.ad_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  company_name text,
  email text NOT NULL,
  phone text,
  ad_type text NOT NULL,
  sector text,
  message text,
  budget text,
  desired_dates text,
  asset_url text,
  status public.ad_request_status NOT NULL DEFAULT 'new',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ad_requests_status ON public.ad_requests(status);
CREATE INDEX idx_ad_requests_created ON public.ad_requests(created_at DESC);

ALTER TABLE public.ad_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a request (anon allowed)
CREATE POLICY "Anyone can submit ad requests"
ON public.ad_requests FOR INSERT
WITH CHECK (true);

-- Authenticated users can view their own requests
CREATE POLICY "Users view their own ad requests"
ON public.ad_requests FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- Admins manage all requests
CREATE POLICY "Admins manage ad requests"
ON public.ad_requests FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER trg_ad_requests_updated_at
BEFORE UPDATE ON public.ad_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 5. Functions
-- =========================================================

-- Get active campaigns for the home banner (max 5, ordered by priority)
CREATE OR REPLACE FUNCTION public.get_active_ad_campaigns(p_placement text DEFAULT 'home_top_banner', p_limit int DEFAULT 5)
RETURNS TABLE (
  id uuid,
  title text,
  subtitle text,
  image_url text,
  cta_text text,
  cta_url text,
  campaign_type public.ad_campaign_type
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, title, subtitle, image_url, cta_text, cta_url, campaign_type
  FROM public.ad_campaigns
  WHERE placement = p_placement
    AND status = 'active'
    AND (payment_status = 'paid' OR campaign_type = 'yusiop_service')
    AND (start_date IS NULL OR start_date <= now())
    AND (end_date IS NULL OR end_date >= now())
  ORDER BY
    CASE WHEN campaign_type = 'yusiop_service' THEN 1 ELSE 0 END ASC, -- paid first
    priority DESC,
    start_date DESC NULLS LAST,
    created_at DESC
  LIMIT p_limit;
$$;

-- Track impression
CREATE OR REPLACE FUNCTION public.track_ad_impression(p_campaign_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.ad_campaigns
  SET impressions = impressions + 1
  WHERE id = p_campaign_id;
$$;

-- Track click
CREATE OR REPLACE FUNCTION public.track_ad_click(p_campaign_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.ad_campaigns
  SET clicks = clicks + 1
  WHERE id = p_campaign_id;
$$;

-- Expire old campaigns (called periodically or on read)
CREATE OR REPLACE FUNCTION public.expire_ad_campaigns()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.ad_campaigns
  SET status = 'expired'
  WHERE status = 'active'
    AND end_date IS NOT NULL
    AND end_date < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Submit ad request (callable by anyone, including anon)
CREATE OR REPLACE FUNCTION public.submit_ad_request(
  p_name text,
  p_email text,
  p_ad_type text,
  p_company_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_sector text DEFAULT NULL,
  p_message text DEFAULT NULL,
  p_budget text DEFAULT NULL,
  p_desired_dates text DEFAULT NULL,
  p_asset_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_admin record;
BEGIN
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'name_required';
  END IF;
  IF p_email IS NULL OR length(trim(p_email)) = 0 THEN
    RAISE EXCEPTION 'email_required';
  END IF;

  INSERT INTO public.ad_requests (
    user_id, name, company_name, email, phone, ad_type, sector,
    message, budget, desired_dates, asset_url
  ) VALUES (
    auth.uid(), trim(p_name), p_company_name, trim(p_email), p_phone, p_ad_type, p_sector,
    p_message, p_budget, p_desired_dates, p_asset_url
  )
  RETURNING id INTO v_id;

  -- Notify all admins
  FOR v_admin IN
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_admin.user_id,
      'ad_request',
      'Nueva solicitud de publicidad',
      coalesce(p_company_name, p_name) || ' quiere anunciarse en YUSIOP',
      jsonb_build_object('request_id', v_id, 'email', p_email, 'ad_type', p_ad_type)
    );
  END LOOP;

  RETURN v_id;
END;
$$;

-- Create artist release campaign (verified artists only)
CREATE OR REPLACE FUNCTION public.create_artist_release_ad(
  p_artist_id uuid,
  p_title text,
  p_subtitle text,
  p_image_url text,
  p_cta_text text,
  p_cta_url text,
  p_duration_days integer,
  p_price_eur numeric,
  p_price_xaf numeric,
  p_start_date timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'artist') THEN
    RAISE EXCEPTION 'not_artist';
  END IF;
  IF NOT public.user_owns_artist(auth.uid(), p_artist_id) THEN
    RAISE EXCEPTION 'not_owner';
  END IF;

  INSERT INTO public.ad_campaigns (
    user_id, artist_id, title, subtitle, image_url, cta_text, cta_url,
    campaign_type, status, payment_status, duration_days, price_eur, price_xaf,
    start_date, end_date
  ) VALUES (
    auth.uid(), p_artist_id, p_title, p_subtitle, p_image_url,
    coalesce(p_cta_text, 'Escuchar ahora'), p_cta_url,
    'artist_release', 'pending_payment', 'unpaid', p_duration_days, p_price_eur, p_price_xaf,
    coalesce(p_start_date, now()),
    coalesce(p_start_date, now()) + (p_duration_days || ' days')::interval
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Admin: approve campaign (sets active + paid)
CREATE OR REPLACE FUNCTION public.admin_approve_ad_campaign(p_campaign_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  UPDATE public.ad_campaigns
  SET status = 'active',
      reviewed_at = now(),
      reviewed_by = auth.uid()
  WHERE id = p_campaign_id;
END;
$$;

-- Admin: reject campaign
CREATE OR REPLACE FUNCTION public.admin_reject_ad_campaign(p_campaign_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  UPDATE public.ad_campaigns
  SET status = 'rejected',
      rejection_reason = p_reason,
      reviewed_at = now(),
      reviewed_by = auth.uid()
  WHERE id = p_campaign_id;
END;
$$;