-- 1) Limpiar las reclamaciones pendientes auto-generadas de Ed Martin
-- para que el flujo manual ("Reclamar") sea el único punto de entrada.
DELETE FROM public.collaboration_claims cc
USING public.artist_requests ar
WHERE ar.user_id = cc.claimant_user_id
  AND lower(ar.artist_name) = 'ed martin'
  AND ar.status = 'approved'
  AND cc.status = 'pending'
  AND cc.message ILIKE 'Reclamacion regenerada%';

-- 2) Marcar como leídas las notificaciones antiguas de "en revisión" para Ed Martin.
UPDATE public.notifications n
SET read = true
WHERE n.type IN ('collab_auto_assigned', 'collab_claim_pending')
  AND n.user_id IN (
    SELECT user_id FROM public.artist_requests
    WHERE lower(artist_name) = 'ed martin' AND status = 'approved'
  );

-- 3) Trigger: al crear una nueva reclamación, notificar a TODOS los admins
--    con una notificación persistente en su campana.
CREATE OR REPLACE FUNCTION public.notify_admins_new_collab_claim()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_song_title text;
BEGIN
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  SELECT s.title INTO v_song_title
  FROM public.song_collaborators sc
  LEFT JOIN public.songs s ON s.id = sc.song_id
  WHERE sc.id = NEW.collaborator_id;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT
    ur.user_id,
    'collab_claim_new',
    'Nueva reclamación de colaboración',
    NEW.claimant_artist_name || ' reclama su parte en "' || COALESCE(v_song_title, 'una canción') || '". Revísalo en Reclamaciones.',
    jsonb_build_object(
      'claim_id', NEW.id,
      'collaborator_id', NEW.collaborator_id,
      'claimant_artist_name', NEW.claimant_artist_name,
      'song_title', v_song_title
    )
  FROM public.user_roles ur
  WHERE ur.role = 'admin';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_new_collab_claim ON public.collaboration_claims;
CREATE TRIGGER trg_notify_admins_new_collab_claim
AFTER INSERT ON public.collaboration_claims
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_new_collab_claim();

-- 4) Trigger: al resolver una reclamación, notificar al artista reclamante.
CREATE OR REPLACE FUNCTION public.notify_artist_claim_resolved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_song_title text;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('approved', 'rejected') THEN
    RETURN NEW;
  END IF;

  SELECT s.title INTO v_song_title
  FROM public.song_collaborators sc
  LEFT JOIN public.songs s ON s.id = sc.song_id
  WHERE sc.id = NEW.collaborator_id;

  IF NEW.status = 'approved' THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      NEW.claimant_user_id,
      'collab_claim_approved',
      '¡Reclamación aprobada!',
      'Tu reclamación sobre "' || COALESCE(v_song_title, 'la colaboración') || '" ha sido aprobada. Las regalías ya se computan a tu nombre.',
      jsonb_build_object('claim_id', NEW.id, 'song_title', v_song_title)
    );
  ELSE
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      NEW.claimant_user_id,
      'collab_claim_rejected',
      'Reclamación rechazada',
      'Tu reclamación sobre "' || COALESCE(v_song_title, 'la colaboración') || '" ha sido rechazada.' ||
        CASE WHEN NEW.rejection_reason IS NOT NULL AND NEW.rejection_reason <> ''
             THEN ' Motivo: ' || NEW.rejection_reason ELSE '' END,
      jsonb_build_object('claim_id', NEW.id, 'song_title', v_song_title, 'reason', NEW.rejection_reason)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_artist_claim_resolved ON public.collaboration_claims;
CREATE TRIGGER trg_notify_artist_claim_resolved
AFTER UPDATE ON public.collaboration_claims
FOR EACH ROW
EXECUTE FUNCTION public.notify_artist_claim_resolved();