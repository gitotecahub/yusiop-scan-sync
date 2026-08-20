-- 1) artist_withdrawal_methods: verification_status only changeable by admins
DROP POLICY IF EXISTS "Artists update their own methods" ON public.artist_withdrawal_methods;
CREATE POLICY "Artists update their own methods"
  ON public.artist_withdrawal_methods FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.guard_withdrawal_method_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
     AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'verification_status can only be changed by administrators';
  END IF;
  IF (NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason)
     AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'rejection_reason can only be changed by administrators';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_withdrawal_method_verification ON public.artist_withdrawal_methods;
CREATE TRIGGER guard_withdrawal_method_verification
  BEFORE UPDATE ON public.artist_withdrawal_methods
  FOR EACH ROW EXECUTE FUNCTION public.guard_withdrawal_method_verification();

-- 2) song_collaborators_public: SECURITY INVOKER view + row policy + no email exposure
CREATE OR REPLACE VIEW public.song_collaborators_public AS
  SELECT sc.id, sc.song_id, sc.artist_name, sc.role, sc.share_percent,
         sc.is_primary, sc.created_at
  FROM public.song_collaborators sc
  WHERE sc.song_id IS NOT NULL;
ALTER VIEW public.song_collaborators_public SET (security_invoker = true);
GRANT SELECT ON public.song_collaborators_public TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can view collaborators of catalog songs" ON public.song_collaborators;
CREATE POLICY "Anyone can view collaborators of catalog songs"
  ON public.song_collaborators FOR SELECT TO anon, authenticated
  USING (song_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.songs s WHERE s.id = song_collaborators.song_id));

-- column-level: contact_email is no longer readable through the Data API
REVOKE SELECT ON public.song_collaborators FROM anon, authenticated;
GRANT SELECT (id, submission_id, song_id, artist_name, share_percent, is_primary,
              claimed_by_user_id, claimed_at, created_at, updated_at, role)
  ON public.song_collaborators TO anon, authenticated;
GRANT ALL ON public.song_collaborators TO service_role;

-- controlled access to contact emails for admins and submission owners
CREATE OR REPLACE FUNCTION public.get_submission_collaborators(p_submission_id uuid)
RETURNS TABLE (
  id uuid, submission_id uuid, artist_name text, role collab_role,
  share_percent numeric, is_primary boolean, contact_email text,
  claimed_by_user_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;
  IF NOT (
    public.is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.song_submissions s
               WHERE s.id = p_submission_id AND s.user_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  RETURN QUERY
    SELECT sc.id, sc.submission_id, sc.artist_name, sc.role, sc.share_percent,
           sc.is_primary, sc.contact_email, sc.claimed_by_user_id
    FROM public.song_collaborators sc
    WHERE sc.submission_id = p_submission_id
    ORDER BY sc.is_primary DESC, sc.created_at;
END;
$$;

-- 3) Lock down EXECUTE on SECURITY DEFINER functions
DO $do$
DECLARE
  r record;
  public_fns text[] := ARRAY[
    'get_popular_songs','get_upcoming_releases','get_active_ad_campaigns',
    'get_public_financial_settings','get_subscription_visibility','get_gift_preview'
  ];
BEGIN
  FOR r IN
    SELECT p.oid, p.proname, (p.prorettype = 'trigger'::regtype) AS is_trigger,
           p.oid::regprocedure::text AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);

    IF NOT r.is_trigger THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
      IF r.proname = ANY (public_fns) THEN
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', r.sig);
      END IF;
    END IF;
  END LOOP;
END
$do$;

GRANT EXECUTE ON FUNCTION public.get_submission_collaborators(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_submission_collaborators(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.guard_withdrawal_method_verification() FROM PUBLIC, anon, authenticated;