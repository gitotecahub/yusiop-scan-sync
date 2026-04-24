-- 1) Enum para el estado de análisis de copyright
DO $$ BEGIN
  CREATE TYPE public.copyright_status AS ENUM ('pending','analyzing','clean','review','blocked','error');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2) Nuevas columnas en song_submissions
ALTER TABLE public.song_submissions
  ADD COLUMN IF NOT EXISTS copyright_status public.copyright_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS copyright_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS copyright_matches jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS copyright_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS audio_hash text;

CREATE INDEX IF NOT EXISTS idx_song_submissions_audio_hash
  ON public.song_submissions(audio_hash) WHERE audio_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_song_submissions_copyright_status
  ON public.song_submissions(copyright_status);

-- 3) Función para que la edge function pueda bloquear automáticamente
CREATE OR REPLACE FUNCTION public.mark_copyright_blocked(
  p_submission_id uuid,
  p_reason text,
  p_score integer,
  p_matches jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub public.song_submissions%ROWTYPE;
BEGIN
  SELECT * INTO v_sub FROM public.song_submissions WHERE id = p_submission_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  UPDATE public.song_submissions
  SET copyright_status = 'blocked',
      copyright_score = COALESCE(p_score, 0),
      copyright_matches = COALESCE(p_matches, '[]'::jsonb),
      copyright_checked_at = now(),
      status = CASE WHEN status = 'pending' THEN 'rejected'::public.song_submission_status ELSE status END,
      rejection_reason = COALESCE(rejection_reason, '') ||
        CASE WHEN COALESCE(rejection_reason,'') = '' THEN '' ELSE E'\n' END ||
        '[Copyright detectado] ' || COALESCE(p_reason, 'Posible infracción de derechos de autor'),
      reviewed_at = COALESCE(reviewed_at, now())
  WHERE id = p_submission_id;

  -- Notificar al artista
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_sub.user_id,
    'song_copyright_blocked',
    '⚠️ Posible problema de copyright detectado',
    'Tu canción "' || v_sub.title || '" no se puede publicar porque coincide con material protegido por derechos de autor.',
    jsonb_build_object(
      'submission_id', p_submission_id,
      'song_title', v_sub.title,
      'score', p_score,
      'matches', p_matches
    )
  );
END;
$$;

-- 4) Función para actualizar resultado del análisis (limpio o requiere revisión)
CREATE OR REPLACE FUNCTION public.update_copyright_analysis(
  p_submission_id uuid,
  p_status public.copyright_status,
  p_score integer,
  p_matches jsonb,
  p_audio_hash text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.song_submissions
  SET copyright_status = p_status,
      copyright_score = COALESCE(p_score, 0),
      copyright_matches = COALESCE(p_matches, '[]'::jsonb),
      copyright_checked_at = now(),
      audio_hash = COALESCE(p_audio_hash, audio_hash)
  WHERE id = p_submission_id;
END;
$$;