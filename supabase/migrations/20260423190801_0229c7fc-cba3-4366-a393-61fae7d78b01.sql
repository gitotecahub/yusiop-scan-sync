-- 1) Add scheduled_release_at to songs and song_submissions
ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS scheduled_release_at timestamptz;

ALTER TABLE public.song_submissions
  ADD COLUMN IF NOT EXISTS scheduled_release_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_songs_scheduled_release_at
  ON public.songs(scheduled_release_at) WHERE scheduled_release_at IS NOT NULL;

-- 2) Public visibility: only show songs already released
DROP POLICY IF EXISTS "Songs are publicly readable" ON public.songs;
DROP POLICY IF EXISTS "songs_select" ON public.songs;

CREATE POLICY "Released songs are publicly readable"
ON public.songs
FOR SELECT
TO public
USING (scheduled_release_at IS NULL OR scheduled_release_at <= now());

-- Admins / artist owners can still see scheduled ones
CREATE POLICY "Admins can view all songs"
ON public.songs
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Artist owners can view their scheduled songs"
ON public.songs
FOR SELECT
TO authenticated
USING (user_owns_artist(auth.uid(), artist_id));

-- 3) New approval RPC supporting scheduled release
CREATE OR REPLACE FUNCTION public.approve_song_submission_scheduled(
  p_submission_id uuid,
  p_release_at timestamptz DEFAULT NULL
)
RETURNS TABLE(success boolean, message text, song_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_submission public.song_submissions%ROWTYPE;
  v_artist_id uuid;
  v_album_id uuid;
  v_song_id uuid;
  v_collab_count int;
  v_sum numeric;
  v_effective_release timestamptz;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN QUERY SELECT false, 'No autorizado'::text, NULL::uuid;
    RETURN;
  END IF;

  SELECT * INTO v_submission FROM public.song_submissions WHERE id = p_submission_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Envío no encontrado'::text, NULL::uuid;
    RETURN;
  END IF;

  IF v_submission.status <> 'pending' THEN
    RETURN QUERY SELECT false, 'El envío ya fue revisado'::text, NULL::uuid;
    RETURN;
  END IF;

  SELECT COUNT(*), COALESCE(SUM(share_percent),0)
    INTO v_collab_count, v_sum
  FROM public.song_collaborators
  WHERE submission_id = p_submission_id;

  IF v_collab_count > 0 AND v_sum <> 100 THEN
    RETURN QUERY SELECT false, ('La suma de splits debe ser 100% (actual: ' || v_sum || '%)')::text, NULL::uuid;
    RETURN;
  END IF;

  -- Effective release: NULL or past = publish now; future = schedule
  IF p_release_at IS NULL OR p_release_at <= now() THEN
    v_effective_release := NULL;
  ELSE
    v_effective_release := p_release_at;
  END IF;

  SELECT id INTO v_artist_id FROM public.artists WHERE lower(name) = lower(v_submission.artist_name) LIMIT 1;
  IF v_artist_id IS NULL THEN
    INSERT INTO public.artists (name) VALUES (v_submission.artist_name) RETURNING id INTO v_artist_id;
  END IF;

  IF v_submission.album_title IS NOT NULL AND length(trim(v_submission.album_title)) > 0 THEN
    SELECT id INTO v_album_id FROM public.albums
      WHERE artist_id = v_artist_id AND lower(title) = lower(v_submission.album_title)
      LIMIT 1;
    IF v_album_id IS NULL THEN
      INSERT INTO public.albums (artist_id, title, release_date, cover_url)
        VALUES (v_artist_id, v_submission.album_title, v_submission.release_date, v_submission.cover_url)
        RETURNING id INTO v_album_id;
    END IF;
  END IF;

  INSERT INTO public.songs (
    artist_id, album_id, title, duration_seconds,
    cover_url, track_url, preview_url, preview_start_seconds,
    scheduled_release_at
  ) VALUES (
    v_artist_id, v_album_id, v_submission.title, v_submission.duration_seconds,
    v_submission.cover_url, v_submission.track_url, v_submission.preview_url, v_submission.preview_start_seconds,
    v_effective_release
  ) RETURNING id INTO v_song_id;

  IF v_collab_count > 0 THEN
    INSERT INTO public.song_collaborators
      (song_id, artist_name, share_percent, is_primary, claimed_by_user_id, claimed_at)
    SELECT
      v_song_id, sc.artist_name, sc.share_percent, sc.is_primary,
      CASE WHEN lower(sc.artist_name) = lower(v_submission.artist_name) THEN v_submission.user_id ELSE NULL END,
      CASE WHEN lower(sc.artist_name) = lower(v_submission.artist_name) THEN now() ELSE NULL END
    FROM public.song_collaborators sc
    WHERE sc.submission_id = p_submission_id;
  ELSE
    INSERT INTO public.song_collaborators
      (song_id, artist_name, share_percent, is_primary, claimed_by_user_id, claimed_at)
    VALUES
      (v_song_id, v_submission.artist_name, 100, true, v_submission.user_id, now());
  END IF;

  UPDATE public.song_submissions
    SET status = 'approved',
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        published_song_id = v_song_id,
        scheduled_release_at = v_effective_release,
        rejection_reason = NULL
    WHERE id = p_submission_id;

  IF v_effective_release IS NULL THEN
    RETURN QUERY SELECT true, 'Canción publicada en el catálogo'::text, v_song_id;
  ELSE
    RETURN QUERY SELECT true, ('Canción programada para ' || to_char(v_effective_release AT TIME ZONE 'Europe/Madrid', 'DD/MM/YYYY HH24:MI') || ' (Madrid)')::text, v_song_id;
  END IF;
END;
$$;

-- 4) Cron auto-release: clear scheduled_release_at when due
CREATE OR REPLACE FUNCTION public.release_scheduled_songs()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_released int := 0;
  r record;
BEGIN
  FOR r IN
    SELECT s.id, s.title, s.artist_id, sub.user_id
    FROM public.songs s
    LEFT JOIN public.song_submissions sub ON sub.published_song_id = s.id
    WHERE s.scheduled_release_at IS NOT NULL
      AND s.scheduled_release_at <= now()
  LOOP
    UPDATE public.songs SET scheduled_release_at = NULL WHERE id = r.id;
    UPDATE public.song_submissions SET scheduled_release_at = NULL WHERE published_song_id = r.id;

    IF r.user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (
        r.user_id,
        'song_released',
        '🎉 ¡Tu canción ya está disponible!',
        'Tu canción "' || r.title || '" se ha publicado en el catálogo de Yusiop.',
        jsonb_build_object('song_id', r.id, 'song_title', r.title)
      );
    END IF;

    v_released := v_released + 1;
  END LOOP;
  RETURN v_released;
END;
$$;

-- 5) Public RPC for upcoming releases (visible "Próximos lanzamientos")
CREATE OR REPLACE FUNCTION public.get_upcoming_releases()
RETURNS TABLE(
  id uuid,
  title text,
  artist_name text,
  cover_url text,
  scheduled_release_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT s.id, s.title, a.name, s.cover_url, s.scheduled_release_at
  FROM public.songs s
  JOIN public.artists a ON a.id = s.artist_id
  WHERE s.scheduled_release_at IS NOT NULL
    AND s.scheduled_release_at > now()
  ORDER BY s.scheduled_release_at ASC
  LIMIT 50;
$$;

-- 6) Enable pg_cron + pg_net and schedule the release job every minute
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'release-scheduled-songs') THEN
    PERFORM cron.unschedule('release-scheduled-songs');
  END IF;
  PERFORM cron.schedule(
    'release-scheduled-songs',
    '* * * * *',
    $cron$ SELECT public.release_scheduled_songs(); $cron$
  );
END $$;