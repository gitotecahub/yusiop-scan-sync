-- 1. Add new participation type for full-artist ownership claims
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'claim_participation_type' AND e.enumlabel = 'artist_ownership'
  ) THEN
    ALTER TYPE claim_participation_type ADD VALUE 'artist_ownership';
  END IF;
EXCEPTION WHEN undefined_object THEN
  -- enum may have a different name; try to detect from column
  NULL;
END $$;

-- 2. Add target_artist_id column on claims_v2 to support artist-level claims
ALTER TABLE public.collaboration_claims_v2
  ADD COLUMN IF NOT EXISTS target_artist_id uuid;

CREATE INDEX IF NOT EXISTS idx_claims_v2_target_artist
  ON public.collaboration_claims_v2(target_artist_id)
  WHERE target_artist_id IS NOT NULL;

-- 3. Fast name match index on catalog artists
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_artists_name_trgm
  ON public.artists USING gin (lower(name) gin_trgm_ops);

-- 4. Pool amount aggregator for a catalog artist
CREATE OR REPLACE FUNCTION public.get_artist_pool_amount(p_artist_id uuid)
RETURNS TABLE(
  total_xaf bigint,
  held_xaf bigint,
  available_xaf bigint,
  earnings_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(artist_amount_xaf), 0)::bigint AS total_xaf,
    COALESCE(SUM(CASE WHEN is_held THEN artist_amount_xaf ELSE 0 END), 0)::bigint AS held_xaf,
    COALESCE(SUM(CASE WHEN NOT is_held AND status IN ('pending_validation','available') THEN artist_amount_xaf ELSE 0 END), 0)::bigint AS available_xaf,
    COUNT(*)::bigint
  FROM public.artist_earnings
  WHERE artist_id = p_artist_id;
$$;

-- 5. Pool match finder for a registering artist by stage name
CREATE OR REPLACE FUNCTION public.find_artist_pool_matches(p_stage_name text)
RETURNS TABLE(
  artist_id uuid,
  artist_name text,
  avatar_url text,
  similarity real,
  total_pool_xaf bigint,
  already_claimed boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    a.id,
    a.name,
    a.avatar_url,
    similarity(lower(a.name), lower(p_stage_name)) AS sim,
    COALESCE((SELECT SUM(artist_amount_xaf) FROM public.artist_earnings ae WHERE ae.artist_id = a.id), 0)::bigint AS total_pool_xaf,
    EXISTS (SELECT 1 FROM public.artist_profiles ap WHERE ap.artist_id = a.id) AS already_claimed
  FROM public.artists a
  WHERE lower(a.name) % lower(p_stage_name)
     OR lower(a.name) = lower(p_stage_name)
  ORDER BY sim DESC
  LIMIT 10;
$$;

-- 6. Admin link function (idempotent, prevents stealing)
CREATE OR REPLACE FUNCTION public.link_verified_artist_profile(
  p_profile_id uuid,
  p_artist_id uuid
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_existing_profile_id uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT id INTO v_existing_profile_id
  FROM public.artist_profiles
  WHERE artist_id = p_artist_id
    AND id <> p_profile_id;

  IF v_existing_profile_id IS NOT NULL THEN
    RAISE EXCEPTION 'catalog artist already linked to another profile (%)', v_existing_profile_id;
  END IF;

  UPDATE public.artist_profiles
  SET artist_id = p_artist_id,
      updated_at = now()
  WHERE id = p_profile_id;
END;
$$;

-- 7. Release hold on all earnings of an artist (used when ownership claim approved)
CREATE OR REPLACE FUNCTION public.release_artist_pool_hold(p_artist_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.artist_earnings
  SET is_held = false, updated_at = now()
  WHERE artist_id = p_artist_id AND is_held = true;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
