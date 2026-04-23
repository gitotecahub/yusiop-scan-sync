-- Enum para el estado del envío
CREATE TYPE public.song_submission_status AS ENUM ('pending', 'approved', 'rejected');

-- Tabla song_submissions
CREATE TABLE public.song_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  artist_name text NOT NULL,
  album_title text,
  duration_seconds integer NOT NULL DEFAULT 0,
  track_url text NOT NULL,
  track_path text,
  preview_url text,
  preview_path text,
  cover_url text,
  cover_path text,
  status public.song_submission_status NOT NULL DEFAULT 'pending',
  rejection_reason text,
  published_song_id uuid,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_song_submissions_user ON public.song_submissions(user_id);
CREATE INDEX idx_song_submissions_status ON public.song_submissions(status);

ALTER TABLE public.song_submissions ENABLE ROW LEVEL SECURITY;

-- RLS: artistas
CREATE POLICY "Users can create their own song submissions"
ON public.song_submissions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'artist'));

CREATE POLICY "Users can view their own song submissions"
ON public.song_submissions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pending submissions"
ON public.song_submissions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending');

-- RLS: admins
CREATE POLICY "Admins can view all song submissions"
ON public.song_submissions
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update song submissions"
ON public.song_submissions
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete song submissions"
ON public.song_submissions
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Trigger updated_at
CREATE TRIGGER update_song_submissions_updated_at
BEFORE UPDATE ON public.song_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Bucket privado para envíos
INSERT INTO storage.buckets (id, name, public)
VALUES ('artist-submissions', 'artist-submissions', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: cada usuario en su carpeta /<auth.uid()>/...
CREATE POLICY "Artists can upload their own submission files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'artist-submissions'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND public.has_role(auth.uid(), 'artist')
);

CREATE POLICY "Artists can read their own submission files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'artist-submissions'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Artists can delete their own submission files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'artist-submissions'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can read all submission files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'artist-submissions'
  AND public.is_admin(auth.uid())
);

CREATE POLICY "Admins can delete all submission files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'artist-submissions'
  AND public.is_admin(auth.uid())
);

-- RPC: aprobar envío -> publicar en catálogo
CREATE OR REPLACE FUNCTION public.approve_song_submission(p_submission_id uuid)
RETURNS TABLE(success boolean, message text, song_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Buscar o crear artista por nombre
  SELECT id INTO v_artist_id
  FROM public.artists
  WHERE lower(name) = lower(trim(v_sub.artist_name))
  LIMIT 1;

  IF v_artist_id IS NULL THEN
    INSERT INTO public.artists (name) VALUES (trim(v_sub.artist_name))
    RETURNING id INTO v_artist_id;
  END IF;

  -- Álbum opcional por título (del mismo artista)
  IF v_sub.album_title IS NOT NULL AND length(trim(v_sub.album_title)) > 0 THEN
    SELECT id INTO v_album_id
    FROM public.albums
    WHERE artist_id = v_artist_id AND lower(title) = lower(trim(v_sub.album_title))
    LIMIT 1;

    IF v_album_id IS NULL THEN
      INSERT INTO public.albums (artist_id, title, cover_url)
      VALUES (v_artist_id, trim(v_sub.album_title), v_sub.cover_url)
      RETURNING id INTO v_album_id;
    END IF;
  END IF;

  -- Insertar canción en el catálogo público
  INSERT INTO public.songs (title, artist_id, album_id, duration_seconds, track_url, preview_url, cover_url)
  VALUES (v_sub.title, v_artist_id, v_album_id, v_sub.duration_seconds, v_sub.track_url, v_sub.preview_url, v_sub.cover_url)
  RETURNING id INTO v_song_id;

  -- Marcar envío como aprobado
  UPDATE public.song_submissions
  SET status = 'approved',
      reviewed_by = v_admin_id,
      reviewed_at = now(),
      rejection_reason = NULL,
      published_song_id = v_song_id
  WHERE id = p_submission_id;

  -- Notificación al artista
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
$$;

-- RPC: rechazar envío con motivo
CREATE OR REPLACE FUNCTION public.reject_song_submission(p_submission_id uuid, p_reason text DEFAULT NULL)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_sub public.song_submissions%ROWTYPE;
BEGIN
  IF v_admin_id IS NULL OR NOT public.is_admin(v_admin_id) THEN
    RETURN QUERY SELECT false, 'No autorizado'::text;
    RETURN;
  END IF;

  SELECT * INTO v_sub FROM public.song_submissions WHERE id = p_submission_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Envío no encontrado'::text;
    RETURN;
  END IF;

  IF v_sub.status <> 'pending' THEN
    RETURN QUERY SELECT false, 'El envío ya fue procesado'::text;
    RETURN;
  END IF;

  UPDATE public.song_submissions
  SET status = 'rejected',
      reviewed_by = v_admin_id,
      reviewed_at = now(),
      rejection_reason = p_reason
  WHERE id = p_submission_id;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_sub.user_id,
    'song_submission_rejected',
    'Canción no aprobada',
    COALESCE('Tu canción "' || v_sub.title || '" no fue aprobada. Motivo: ' || p_reason,
             'Tu canción "' || v_sub.title || '" no fue aprobada.'),
    jsonb_build_object('submission_id', p_submission_id, 'reason', p_reason)
  );

  RETURN QUERY SELECT true, 'Envío rechazado'::text;
END;
$$;