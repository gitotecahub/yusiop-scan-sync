
-- 1. Profiles: birth_date + parental controls
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS age_group text CHECK (age_group IN ('child','teen','adult')),
  ADD COLUMN IF NOT EXISTS parental_email text,
  ADD COLUMN IF NOT EXISTS parental_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS parental_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS parental_verification_token text;

-- Helper: compute age_group from birth_date
CREATE OR REPLACE FUNCTION public.compute_age_group(_birth_date date)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _birth_date IS NULL THEN NULL
    WHEN (date_part('year', age(_birth_date)))::int < 14 THEN 'child'
    WHEN (date_part('year', age(_birth_date)))::int < 18 THEN 'teen'
    ELSE 'adult'
  END;
$$;

-- Trigger to keep age_group in sync
CREATE OR REPLACE FUNCTION public.profiles_sync_age_group()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.birth_date IS NOT NULL THEN
    NEW.age_group := public.compute_age_group(NEW.birth_date);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_sync_age_group ON public.profiles;
CREATE TRIGGER trg_profiles_sync_age_group
BEFORE INSERT OR UPDATE OF birth_date ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_sync_age_group();

-- Backfill existing rows that have birth_date
UPDATE public.profiles
SET age_group = public.compute_age_group(birth_date)
WHERE birth_date IS NOT NULL AND age_group IS NULL;

-- Public helper functions for backend checks
CREATE OR REPLACE FUNCTION public.get_user_age_group(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT age_group FROM public.profiles WHERE user_id = _user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.user_can_withdraw(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = _user_id
      AND (
        p.age_group = 'adult'
        OR (p.age_group = 'teen' AND p.parental_verified = true)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_use_app(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = _user_id
      AND (
        p.birth_date IS NULL -- legacy user, gate handles it
        OR p.age_group IN ('teen','adult')
        OR (p.age_group = 'child' AND p.parental_verified = true)
      )
  );
$$;

-- 2. Songs explicit content
ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS is_explicit boolean NOT NULL DEFAULT false;

ALTER TABLE public.song_submissions
  ADD COLUMN IF NOT EXISTS is_explicit_declared boolean NOT NULL DEFAULT false;

-- 3. Parental verification tokens helper index
CREATE INDEX IF NOT EXISTS idx_profiles_parental_token
  ON public.profiles(parental_verification_token)
  WHERE parental_verification_token IS NOT NULL;
