-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.release_type AS ENUM ('single', 'album');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.release_status AS ENUM ('draft', 'pending_review', 'published', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ RELEASES TABLE ============
CREATE TABLE IF NOT EXISTS public.releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  artist_id uuid,
  release_type public.release_type NOT NULL DEFAULT 'single',
  title text NOT NULL,
  artist_name text NOT NULL,
  cover_url text,
  cover_path text,
  genre text,
  release_date date,
  description text,
  status public.release_status NOT NULL DEFAULT 'pending_review',
  total_tracks integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_releases_user ON public.releases(user_id);
CREATE INDEX IF NOT EXISTS idx_releases_artist ON public.releases(artist_id);
CREATE INDEX IF NOT EXISTS idx_releases_status ON public.releases(status);

ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners view their releases" ON public.releases;
CREATE POLICY "Owners view their releases" ON public.releases
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (artist_id IS NOT NULL AND user_owns_artist(auth.uid(), artist_id)));

DROP POLICY IF EXISTS "Owners insert their releases" ON public.releases;
CREATE POLICY "Owners insert their releases" ON public.releases
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Owners update their draft/rejected releases" ON public.releases;
CREATE POLICY "Owners update their draft/rejected releases" ON public.releases
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status IN ('draft','rejected','pending_review'))
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Owners delete their draft releases" ON public.releases;
CREATE POLICY "Owners delete their draft releases" ON public.releases
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND status IN ('draft','rejected'));

DROP POLICY IF EXISTS "Public can view published releases" ON public.releases;
CREATE POLICY "Public can view published releases" ON public.releases
  FOR SELECT TO public
  USING (status = 'published');

DROP POLICY IF EXISTS "Admins manage all releases" ON public.releases;
CREATE POLICY "Admins manage all releases" ON public.releases
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_releases_updated_at ON public.releases;
CREATE TRIGGER trg_releases_updated_at
  BEFORE UPDATE ON public.releases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SONG_SUBMISSIONS columns ============
ALTER TABLE public.song_submissions
  ADD COLUMN IF NOT EXISTS release_id uuid REFERENCES public.releases(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS release_type public.release_type NOT NULL DEFAULT 'single',
  ADD COLUMN IF NOT EXISTS track_number integer,
  ADD COLUMN IF NOT EXISTS is_explicit boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_submissions_release ON public.song_submissions(release_id);

-- ============ SONGS columns ============
ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS release_id uuid REFERENCES public.releases(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS release_type public.release_type NOT NULL DEFAULT 'single',
  ADD COLUMN IF NOT EXISTS track_number integer,
  ADD COLUMN IF NOT EXISTS is_explicit boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_songs_release ON public.songs(release_id);

-- ============ Realtime ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.releases;