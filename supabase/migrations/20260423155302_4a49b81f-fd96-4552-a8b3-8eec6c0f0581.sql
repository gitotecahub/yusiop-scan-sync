CREATE OR REPLACE FUNCTION public.mark_submission_removed_on_song_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_submission public.song_submissions%ROWTYPE;
BEGIN
  SELECT * INTO v_submission
  FROM public.song_submissions
  WHERE published_song_id = OLD.id
  LIMIT 1;

  UPDATE public.song_submissions
  SET status = 'removed'::public.song_submission_status,
      reviewed_at = now(),
      published_song_id = NULL
  WHERE published_song_id = OLD.id;

  IF v_submission.id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_submission.user_id,
      'song_removed',
      'Tu canción fue eliminada del catálogo',
      'Tu canción "' || v_submission.title || '" ha sido eliminada del catálogo de Yusiop.',
      jsonb_build_object(
        'submission_id', v_submission.id,
        'song_title', v_submission.title
      )
    );
  END IF;

  RETURN OLD;
END;
$$;