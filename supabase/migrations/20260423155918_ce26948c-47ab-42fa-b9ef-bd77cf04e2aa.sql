-- Backfill: marcar como 'removed' las submissions aprobadas cuya canción publicada
-- ya fue eliminada del catálogo (published_song_id huérfano).
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT s.id, s.user_id, s.title
    FROM public.song_submissions s
    LEFT JOIN public.songs sg ON sg.id = s.published_song_id
    WHERE s.status = 'approved'
      AND (s.published_song_id IS NULL OR sg.id IS NULL)
  LOOP
    UPDATE public.song_submissions
    SET status = 'removed'::public.song_submission_status,
        reviewed_at = now(),
        published_song_id = NULL
    WHERE id = r.id;

    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      r.user_id,
      'song_removed',
      'Tu canción fue eliminada del catálogo',
      'Tu canción "' || r.title || '" ha sido eliminada del catálogo de Yusiop.',
      jsonb_build_object('submission_id', r.id, 'song_title', r.title)
    );
  END LOOP;
END $$;

-- Asegurar que el trigger esté creado y enlazado a la tabla songs.
-- (La función mark_submission_removed_on_song_delete ya existe; nos aseguramos del trigger).
DROP TRIGGER IF EXISTS trg_mark_submission_removed_on_song_delete ON public.songs;
CREATE TRIGGER trg_mark_submission_removed_on_song_delete
BEFORE DELETE ON public.songs
FOR EACH ROW
EXECUTE FUNCTION public.mark_submission_removed_on_song_delete();