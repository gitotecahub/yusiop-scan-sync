-- 1. PROFILES: remove blanket authenticated read
DROP POLICY IF EXISTS "Authenticated users can lookup public profile fields" ON public.profiles;

CREATE OR REPLACE FUNCTION public.get_public_profiles(p_user_ids uuid[])
RETURNS TABLE(user_id uuid, username text, full_name text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.user_id, p.username, p.full_name, p.avatar_url
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.user_id = ANY(p_user_ids)
$$;

CREATE OR REPLACE FUNCTION public.search_public_profiles(p_query text, p_limit integer DEFAULT 8)
RETURNS TABLE(user_id uuid, username text, full_name text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.user_id, p.username, p.full_name, p.avatar_url
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND (
      coalesce(p_query, '') = ''
      OR p.username ILIKE '%' || p_query || '%'
      OR p.full_name ILIKE '%' || p_query || '%'
    )
  ORDER BY p.username
  LIMIT least(coalesce(p_limit, 8), 20)
$$;

-- 2. SONG_COLLABORATORS: stop leaking contact_email publicly
DROP POLICY IF EXISTS "Public can view collaborators of published songs" ON public.song_collaborators;

CREATE OR REPLACE VIEW public.song_collaborators_public AS
  SELECT sc.id, sc.song_id, sc.artist_name, sc.role, sc.share_percent,
         sc.is_primary, sc.created_at
  FROM public.song_collaborators sc
  WHERE sc.song_id IS NOT NULL;

ALTER VIEW public.song_collaborators_public SET (security_invoker = false);
GRANT SELECT ON public.song_collaborators_public TO anon, authenticated;

-- 3. USER_OWNS_ARTIST: id-based ownership instead of name matching
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS owner_user_id uuid;

UPDATE public.artists a
SET owner_user_id = ap.user_id
FROM public.artist_profiles ap
WHERE ap.artist_id = a.id AND a.owner_user_id IS NULL;

UPDATE public.artists a
SET owner_user_id = ar.user_id
FROM public.artist_requests ar
WHERE a.owner_user_id IS NULL
  AND ar.status = 'approved'
  AND lower(ar.artist_name) = lower(a.name);

CREATE INDEX IF NOT EXISTS idx_artists_owner_user_id ON public.artists(owner_user_id);

CREATE OR REPLACE FUNCTION public.user_owns_artist(_user_id uuid, _artist_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.artists a
    WHERE a.id = _artist_id AND a.owner_user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.artist_profiles ap
    WHERE ap.artist_id = _artist_id
      AND ap.user_id = _user_id
      AND ap.verification_status = 'artist_verified'
  );
$$;

CREATE OR REPLACE FUNCTION public.ensure_artist_owner()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.artist_id IS NOT NULL AND NEW.user_id IS NOT NULL THEN
    UPDATE public.artists SET owner_user_id = NEW.user_id
    WHERE id = NEW.artist_id AND owner_user_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_artist_profiles_owner ON public.artist_profiles;
CREATE TRIGGER trg_artist_profiles_owner
AFTER INSERT OR UPDATE OF artist_id ON public.artist_profiles
FOR EACH ROW EXECUTE FUNCTION public.ensure_artist_owner();

-- 4. Internal email tables: server-only + admin read
REVOKE ALL ON public.email_send_log, public.email_send_state,
  public.email_unsubscribe_tokens, public.suppressed_emails FROM anon, authenticated;
GRANT ALL ON public.email_send_log, public.email_send_state,
  public.email_unsubscribe_tokens, public.suppressed_emails TO service_role;
GRANT SELECT ON public.email_send_log, public.email_send_state, public.suppressed_emails TO authenticated;

DROP POLICY IF EXISTS "Admins can view email send log" ON public.email_send_log;
CREATE POLICY "Admins can view email send log" ON public.email_send_log
FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view email send state" ON public.email_send_state;
CREATE POLICY "Admins can view email send state" ON public.email_send_state
FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view suppressed emails" ON public.suppressed_emails;
CREATE POLICY "Admins can view suppressed emails" ON public.suppressed_emails
FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "No client access to unsubscribe tokens" ON public.email_unsubscribe_tokens;
CREATE POLICY "No client access to unsubscribe tokens" ON public.email_unsubscribe_tokens
FOR SELECT TO authenticated USING (false);

-- 5. Fix mutable search_path
CREATE OR REPLACE FUNCTION public.set_wallet_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 6. Public ad request form: require minimally valid payload
DROP POLICY IF EXISTS "Anyone can submit ad requests" ON public.ad_requests;
CREATE POLICY "Anyone can submit ad requests" ON public.ad_requests
FOR INSERT TO anon, authenticated
WITH CHECK (
  status = 'new'::ad_request_status
  AND admin_notes IS NULL
  AND name IS NOT NULL AND length(btrim(name)) BETWEEN 2 AND 120
  AND email IS NOT NULL AND length(email) <= 254
  AND email ~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$'
  AND (message IS NULL OR length(message) <= 4000)
);

-- 7. Storage: stop object enumeration on public buckets
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Avatar public read" ON storage.objects;
DROP POLICY IF EXISTS "Ad assets are publicly readable" ON storage.objects;

-- 8. Lock down SECURITY DEFINER function execution, then grant only what the app needs
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef AND p.prokind = 'f'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon, authenticated', r.sig);
  END LOOP;
END $$;

DO $$
DECLARE
  r record;
  auth_names text[] := ARRAY[
    'admin_approve_ad_campaign','admin_approve_withdrawal','admin_disable_recharge_card',
    'admin_generate_recharge_cards','admin_list_recharge_cards','admin_mark_withdrawal_paid',
    'admin_reactivate_recharge_card','admin_reject_ad_campaign','admin_reject_withdrawal',
    'admin_set_method_status','approve_artist_request','approve_song_submission',
    'approve_song_submission_scheduled','reject_artist_request','reject_song_submission',
    'resolve_collaboration_claim','claim_collaboration','consume_submission_prepayment',
    'consume_parental_token','find_artist_pool_matches','link_verified_artist_profile',
    'release_artist_pool_hold','request_artist_withdrawal','get_active_ad_campaigns',
    'get_artist_held_amount','get_artist_pool_amount','get_artist_stats',
    'get_artist_wallet_summary','get_gift_preview','get_pending_collaborations_for_artist',
    'get_popular_songs','get_public_financial_settings','get_subscription_visibility',
    'get_upcoming_releases','get_wallet_summary','gift_song','has_role','is_admin',
    'has_staff_area','has_open_claim_on_song','get_my_staff_areas','user_owns_artist',
    'redeem_gift_card','redeem_recharge_card','search_users_for_friends','submit_ad_request',
    'subscription_metrics','track_ad_click','track_ad_impression','transfer_card_to_user',
    'transfer_song_to_user','get_user_age_group','compute_age_group','estimate_downloads',
    'apply_recharge_bonus','get_or_create_wallet','user_can_withdraw','user_can_use_app',
    'validate_qr_card','log_admin_action','expire_ad_campaigns','sync_historical_earnings',
    'get_ceo_ai_alerts','get_ceo_fraud_summary','get_ceo_health_score','get_ceo_kpis',
    'get_ceo_recommendations','get_ceo_revenue_breakdown','get_ceo_sales_forecast',
    'get_ceo_top_artists','get_ceo_top_songs','get_public_profiles','search_public_profiles'
  ];
  anon_names text[] := ARRAY[
    'get_active_ad_campaigns','get_popular_songs','get_public_financial_settings',
    'get_subscription_visibility','get_upcoming_releases','track_ad_click',
    'track_ad_impression','submit_ad_request','consume_parental_token','get_gift_preview'
  ];
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f' AND p.proname = ANY(auth_names)
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    IF r.proname = ANY(anon_names) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', r.sig);
    END IF;
  END LOOP;
END $$;

-- 9. Move extensions out of the public schema (best effort) and keep trgm callers working
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

DO $$
BEGIN
  BEGIN
    ALTER EXTENSION pg_trgm SET SCHEMA extensions;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_trgm not relocated: %', SQLERRM;
  END;
  BEGIN
    ALTER EXTENSION pg_net SET SCHEMA extensions;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_net not relocated: %', SQLERRM;
  END;
END $$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.proname IN ('find_artist_pool_matches','search_users_for_friends','ensure_artist_for_user')
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, extensions', r.sig);
  END LOOP;
END $$;