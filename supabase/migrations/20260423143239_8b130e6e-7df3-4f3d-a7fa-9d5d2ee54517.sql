-- 1. Añadir columnas nuevas
ALTER TABLE public.song_submissions
  ADD COLUMN IF NOT EXISTS genre text,
  ADD COLUMN IF NOT EXISTS release_date date;

-- 2. Política UPDATE: permitir al artista editar sus envíos rechazados o pendientes
DROP POLICY IF EXISTS "Users can update their own pending or rejected submissions" ON public.song_submissions;
CREATE POLICY "Users can update their own pending or rejected submissions"
ON public.song_submissions
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  AND status IN ('pending', 'rejected')
)
WITH CHECK (
  auth.uid() = user_id
  AND status IN ('pending', 'rejected')
);

-- 3. Actualizar approve_song_submission para incluir genre y release_date
CREATE OR REPLACE FUNCTION public.approve_song_submission(p_submission_id uuid)
 RETURNS TABLE(success boolean, message text, song_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_admin_id uuid := auth.uid();
  v_sub public.song_submissions%ROWTYPE;
  v_artist_id uuid;
  v_album_id uuid;
  v_song_id uuid;
BEGIN
  IF v_admin_id IS NULL OR NOT public.is_admin(v_admin_id) THEN
    RETURN QUERY SELECT false, 'No autorizado'::text, NULL::uuid;
    RETURN;
  END IF;

  SELECT * INTO v_sub FROM public.song_submissions WHERE id = p_submission_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Envío no encontrado'::text, NULL::uuid;
    RETURN;
  END IF;

  IF v_sub.status <> 'pending' THEN
    RETURN QUERY SELECT false, 'El envío ya fue procesado'::text, NULL::uuid;
    RETURN;
  END IF;

  SELECT id INTO v_artist_id
  FROM public.artists
  WHERE lower(name) = lower(trim(v_sub.artist_name))
  LIMIT 1;

  IF v_artist_id IS NULL THEN
    INSERT INTO public.artists (name) VALUES (trim(v_sub.artist_name))
    RETURNING id INTO v_artist_id;
  END IF;

  IF v_sub.album_title IS NOT NULL AND length(trim(v_sub.album_title)) > 0 THEN
    SELECT id INTO v_album_id
    FROM public.albums
    WHERE artist_id = v_artist_id AND lower(title) = lower(trim(v_sub.album_title))
    LIMIT 1;

    IF v_album_id IS NULL THEN
      INSERT INTO public.albums (artist_id, title, cover_url, release_date)
      VALUES (v_artist_id, trim(v_sub.album_title), v_sub.cover_url, v_sub.release_date)
      RETURNING id INTO v_album_id;
    END IF;
  END IF;

  INSERT INTO public.songs (title, artist_id, album_id, duration_seconds, track_url, preview_url, cover_url)
  VALUES (v_sub.title, v_artist_id, v_album_id, v_sub.duration_seconds, v_sub.track_url, v_sub.preview_url, v_sub.cover_url)
  RETURNING id INTO v_song_id;

  UPDATE public.song_submissions
  SET status = 'approved',
      reviewed_by = v_admin_id,
      reviewed_at = now(),
      rejection_reason = NULL,
      published_song_id = v_song_id
  WHERE id = p_submission_id;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_sub.user_id,
    'song_submission_approved',
    '🎶 Tu canción ha sido publicada',
    '"' || v_sub.title || '" ya está en el catálogo de Yusiop.',
    jsonb_build_object('submission_id', p_submission_id, 'song_id', v_song_id)
  );

  RETURN QUERY SELECT true, 'Canción publicada'::text, v_song_id;
END;
$function$;