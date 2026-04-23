-- Añadir columna preview_start_seconds a song_submissions
ALTER TABLE public.song_submissions
ADD COLUMN IF NOT EXISTS preview_start_seconds integer NOT NULL DEFAULT 0;

-- Añadir columna preview_start_seconds a songs
ALTER TABLE public.songs
ADD COLUMN IF NOT EXISTS preview_start_seconds integer NOT NULL DEFAULT 0;

-- Recrear approve_song_submission para incluir preview_start_seconds
CREATE OR REPLACE FUNCTION public.approve_song_submission(p_submission_id uuid)
RETURNS TABLE(success boolean, message text, song_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_submission public.song_submissions%ROWTYPE;
  v_artist_id uuid;
  v_album_id uuid;
  v_song_id uuid;
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

  -- Buscar o crear artista por nombre
  SELECT id INTO v_artist_id FROM public.artists WHERE lower(name) = lower(v_submission.artist_name) LIMIT 1;
  IF v_artist_id IS NULL THEN
    INSERT INTO public.artists (name) VALUES (v_submission.artist_name) RETURNING id INTO v_artist_id;
  END IF;

  -- Buscar o crear álbum si se especificó
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

  -- Insertar canción publicada
  INSERT INTO public.songs (
    artist_id, album_id, title, duration_seconds,
    cover_url, track_url, preview_url, preview_start_seconds
  ) VALUES (
    v_artist_id, v_album_id, v_submission.title, v_submission.duration_seconds,
    v_submission.cover_url, v_submission.track_url, v_submission.preview_url, v_submission.preview_start_seconds
  ) RETURNING id INTO v_song_id;

  -- Marcar envío aprobado
  UPDATE public.song_submissions
    SET status = 'approved',
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        published_song_id = v_song_id,
        rejection_reason = NULL
    WHERE id = p_submission_id;

  RETURN QUERY SELECT true, 'Canción publicada en el catálogo'::text, v_song_id;
END;
$$;