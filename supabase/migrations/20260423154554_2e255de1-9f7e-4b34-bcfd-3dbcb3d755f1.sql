-- 1) Añadir nuevo valor al enum de estados de envío
ALTER TYPE public.song_submission_status ADD VALUE IF NOT EXISTS 'removed';

-- 2) Función que marca el envío como 'removed' cuando se borra la canción publicada
CREATE OR REPLACE FUNCTION public.mark_submission_removed_on_song_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.song_submissions
  SET status = 'removed'::public.song_submission_status,
      reviewed_at = now(),
      published_song_id = NULL
  WHERE published_song_id = OLD.id;
  RETURN OLD;
END;
$$;

-- 3) Trigger en la tabla songs (AFTER DELETE)
DROP TRIGGER IF EXISTS trg_mark_submission_removed ON public.songs;
CREATE TRIGGER trg_mark_submission_removed
AFTER DELETE ON public.songs
FOR EACH ROW
EXECUTE FUNCTION public.mark_submission_removed_on_song_delete();