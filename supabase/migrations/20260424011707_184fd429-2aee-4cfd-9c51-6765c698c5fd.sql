CREATE OR REPLACE FUNCTION public.approve_artist_request(p_request_id uuid)
 RETURNS TABLE(success boolean, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_admin_id uuid := auth.uid();
  v_req public.artist_requests%ROWTYPE;
  v_collab record;
  v_claims_created int := 0;
  v_existing_claim uuid;
BEGIN
  IF v_admin_id IS NULL OR NOT public.is_admin(v_admin_id) THEN
    RETURN QUERY SELECT false, 'No autorizado'::text;
    RETURN;
  END IF;

  SELECT * INTO v_req FROM public.artist_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Solicitud no encontrada'::text;
    RETURN;
  END IF;

  IF v_req.status <> 'pending' THEN
    RETURN QUERY SELECT false, 'La solicitud ya fue procesada'::text;
    RETURN;
  END IF;

  -- Asignar rol artist
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_req.user_id, 'artist')
  ON CONFLICT DO NOTHING;

  -- Crear el artista en el catálogo si no existe (case-insensitive)
  INSERT INTO public.artists (name)
  SELECT v_req.artist_name
  WHERE NOT EXISTS (
    SELECT 1 FROM public.artists WHERE lower(name) = lower(v_req.artist_name)
  );

  -- Marcar solicitud como aprobada
  UPDATE public.artist_requests
  SET status = 'approved',
      reviewed_by = v_admin_id,
      reviewed_at = now(),
      rejection_reason = NULL
  WHERE id = p_request_id;

  -- Notificación de aprobación
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_req.user_id,
    'artist_request_approved',
    '🎤 ¡Eres artista en Yusiop!',
    'Tu solicitud ha sido aprobada. Ya puedes acceder al panel de artista.',
    jsonb_build_object('request_id', p_request_id)
  );

  -- Auto-crear reclamaciones de colaboración para coincidencias exactas (case-insensitive)
  FOR v_collab IN
    SELECT sc.id AS collaborator_id, sc.song_id, s.title AS song_title
    FROM public.song_collaborators sc
    LEFT JOIN public.songs s ON s.id = sc.song_id
    WHERE sc.song_id IS NOT NULL
      AND sc.claimed_by_user_id IS NULL
      AND lower(sc.artist_name) = lower(v_req.artist_name)
  LOOP
    -- Evitar duplicar si ya hay una pendiente
    SELECT id INTO v_existing_claim
    FROM public.collaboration_claims
    WHERE collaborator_id = v_collab.collaborator_id
      AND status = 'pending'
    LIMIT 1;

    IF v_existing_claim IS NULL THEN
      INSERT INTO public.collaboration_claims (
        collaborator_id, claimant_user_id, claimant_artist_name, status, message
      ) VALUES (
        v_collab.collaborator_id,
        v_req.user_id,
        v_req.artist_name,
        'pending',
        'Reclamación creada automáticamente al aprobar el perfil de artista (coincidencia exacta de nombre).'
      );
      v_claims_created := v_claims_created + 1;
    END IF;
  END LOOP;

  -- Notificaciones extra si hay coincidencias en el pozo común
  IF v_claims_created > 0 THEN
    -- Notificación 1: te asignamos como beneficiario en colaboraciones
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_req.user_id,
      'collab_auto_assigned',
      '🎶 Te hemos asignado colaboraciones',
      'Hemos detectado ' || v_claims_created || ' colaboración(es) en el catálogo a nombre de "' || v_req.artist_name || '". Revísalas en tu panel de artista → Colaboraciones.',
      jsonb_build_object('artist_name', v_req.artist_name, 'count', v_claims_created)
    );

    -- Notificación 2: tienes una reclamación pendiente (de revisión por admin)
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_req.user_id,
      'collab_claim_pending',
      '⏳ Reclamación pendiente de revisión',
      'Hemos enviado ' || v_claims_created || ' reclamación(es) de colaboración a revisión por el equipo. Te avisaremos cuando se apruebe.',
      jsonb_build_object('artist_name', v_req.artist_name, 'count', v_claims_created)
    );
  END IF;

  RETURN QUERY SELECT true, 'Solicitud aprobada'::text;
END;
$function$;