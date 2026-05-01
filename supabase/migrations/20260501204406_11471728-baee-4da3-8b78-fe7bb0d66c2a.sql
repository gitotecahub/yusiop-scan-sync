-- 1. Enum tipo de IA
CREATE TYPE public.ai_usage_type AS ENUM (
  'none',
  'assisted',
  'ai_voice',
  'ai_generated'
);

-- 2. Enum estado de revisión
CREATE TYPE public.song_review_status AS ENUM (
  'pending_review',
  'approved',
  'rejected',
  'flagged'
);

-- 3. Campos en song_submissions
ALTER TABLE public.song_submissions
  ADD COLUMN ai_type public.ai_usage_type NOT NULL DEFAULT 'none',
  ADD COLUMN rights_confirmed boolean NOT NULL DEFAULT false;

-- 4. Campos en songs
ALTER TABLE public.songs
  ADD COLUMN ai_type public.ai_usage_type NOT NULL DEFAULT 'none',
  ADD COLUMN review_status public.song_review_status NOT NULL DEFAULT 'approved',
  ADD COLUMN ai_detection_score double precision NULL,
  ADD COLUMN review_notes text NULL,
  ADD COLUMN reviewed_by uuid NULL,
  ADD COLUMN reviewed_at timestamp with time zone NULL;

-- Índice para filtrado público rápido
CREATE INDEX IF NOT EXISTS idx_songs_review_status ON public.songs(review_status);
CREATE INDEX IF NOT EXISTS idx_songs_ai_type ON public.songs(ai_type);

-- 5. Reforzar RLS de songs: público solo ve approved.
-- Eliminar políticas SELECT existentes (revisar nombres habituales) y recrear.
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'songs' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.songs', pol.policyname);
  END LOOP;
END$$;

-- Público (anon + authenticated) solo ve canciones aprobadas
CREATE POLICY "Public can view approved songs"
ON public.songs
FOR SELECT
TO public
USING (review_status = 'approved');

-- Admins ven todo
CREATE POLICY "Admins can view all songs"
ON public.songs
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- Artistas dueños ven sus propias canciones aunque no estén aprobadas
CREATE POLICY "Artist owners can view their songs"
ON public.songs
FOR SELECT
TO authenticated
USING (user_owns_artist(auth.uid(), artist_id));

-- 6. Permitir a admins actualizar review_status (la política ALL de admin ya debería cubrirlo,
-- pero aseguramos UPDATE explícito si no existe).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='songs' AND cmd='UPDATE' AND policyname='Admins can update songs review'
  ) THEN
    CREATE POLICY "Admins can update songs review"
    ON public.songs
    FOR UPDATE
    TO authenticated
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));
  END IF;
END$$;
