-- =========================================================================
-- 1) Función helper: garantiza que exista un artist para un par (user, name)
--    y asigna el rol "artist" al usuario. Idempotente y segura.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.ensure_artist_for_user(
  _user_id uuid,
  _artist_name text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_artist_id uuid;
  v_clean text := btrim(_artist_name);
BEGIN
  IF _user_id IS NULL OR v_clean IS NULL OR v_clean = '' THEN
    RETURN NULL;
  END IF;

  -- Crear artista si no existe (case-insensitive)
  SELECT id INTO v_artist_id
  FROM public.artists
  WHERE lower(name) = lower(v_clean)
  LIMIT 1;

  IF v_artist_id IS NULL THEN
    INSERT INTO public.artists (name)
    VALUES (v_clean)
    RETURNING id INTO v_artist_id;
  END IF;

  -- Asegurar que el usuario tenga el rol artist
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'artist')
  ON CONFLICT DO NOTHING;

  -- Asegurar que exista una artist_request aprobada para este (user, name)
  -- para que user_owns_artist() funcione en consultas posteriores
  IF NOT EXISTS (
    SELECT 1 FROM public.artist_requests
    WHERE user_id = _user_id
      AND lower(artist_name) = lower(v_clean)
      AND status = 'approved'
  ) THEN
    INSERT INTO public.artist_requests (
      user_id, artist_name, status, reviewed_at, bio
    ) VALUES (
      _user_id, v_clean, 'approved', now(),
      'Auto-creado al aprobar una reclamación de colaboración'
    );
  END IF;

  RETURN v_artist_id;
END;
$$;

-- =========================================================================
-- 2) Modificar resolve_collaboration_claim para garantizar el vínculo
--    artista <-> usuario cuando se aprueba una reclamación
-- =========================================================================
CREATE OR REPLACE FUNCTION public.resolve_collaboration_claim(
  p_claim_id uuid, p_approve boolean, p_reason text DEFAULT NULL::text
) RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_claim public.collaboration_claims%ROWTYPE;
  v_collab public.song_collaborators%ROWTYPE;
BEGIN
  IF v_admin IS NULL OR NOT public.is_admin(v_admin) THEN
    RETURN QUERY SELECT false, 'No autorizado'::text; RETURN;
  END IF;

  SELECT * INTO v_claim FROM public.collaboration_claims WHERE id = p_claim_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Solicitud no encontrada'::text; RETURN;
  END IF;

  IF v_claim.status <> 'pending' THEN
    RETURN QUERY SELECT false, 'Solicitud ya procesada'::text; RETURN;
  END IF;

  SELECT * INTO v_collab FROM public.song_collaborators WHERE id = v_claim.collaborator_id FOR UPDATE;

  IF p_approve THEN
    IF v_collab.claimed_by_user_id IS NOT NULL THEN
      RETURN QUERY SELECT false, 'Esta colaboración fue asignada a otro usuario'::text; RETURN;
    END IF;

    -- 🔧 FIX: garantizar que el reclamante tenga su artista en el catálogo
    -- para que user_owns_artist() funcione y los ingresos se reflejen
    PERFORM public.ensure_artist_for_user(v_claim.claimant_user_id, v_claim.claimant_artist_name);

    UPDATE public.song_collaborators
    SET claimed_by_user_id = v_claim.claimant_user_id,
        claimed_at = now()
    WHERE id = v_claim.collaborator_id;

    UPDATE public.collaboration_claims
    SET status = 'approved', reviewed_by = v_admin, reviewed_at = now()
    WHERE id = p_claim_id;

    UPDATE public.collaboration_claims
    SET status = 'rejected',
        reviewed_by = v_admin,
        reviewed_at = now(),
        rejection_reason = 'Asignada a otro usuario'
    WHERE collaborator_id = v_claim.collaborator_id
      AND status = 'pending'
      AND id <> p_claim_id;

    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_claim.claimant_user_id,
      'collab_claim_approved',
      '✅ Reclamación de colaboración aprobada',
      'Tu reclamación de colaboración ha sido aprobada. Ya recibes tu parte de monetización.',
      jsonb_build_object('collaborator_id', v_claim.collaborator_id, 'claim_id', p_claim_id)
    );

    RETURN QUERY SELECT true, 'Reclamación aprobada'::text;
  ELSE
    UPDATE public.collaboration_claims
    SET status = 'rejected',
        reviewed_by = v_admin,
        reviewed_at = now(),
        rejection_reason = p_reason
    WHERE id = p_claim_id;

    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_claim.claimant_user_id,
      'collab_claim_rejected',
      'Reclamación de colaboración rechazada',
      COALESCE('Motivo: ' || p_reason, 'Tu reclamación no fue aprobada.'),
      jsonb_build_object('collaborator_id', v_claim.collaborator_id, 'claim_id', p_claim_id, 'reason', p_reason)
    );

    RETURN QUERY SELECT true, 'Reclamación rechazada'::text;
  END IF;
END;
$$;

-- =========================================================================
-- 3) Reforzar approve_artist_request para usar también el helper
-- =========================================================================
CREATE OR REPLACE FUNCTION public.approve_artist_request(p_request_id uuid)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  -- Garantiza rol + artist en el catálogo (idempotente)
  PERFORM public.ensure_artist_for_user(v_req.user_id, v_req.artist_name);

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

  -- Auto-crear reclamaciones de colaboración para coincidencias exactas
  FOR v_collab IN
    SELECT sc.id AS collaborator_id, sc.song_id, s.title AS song_title
    FROM public.song_collaborators sc
    LEFT JOIN public.songs s ON s.id = sc.song_id
    WHERE sc.song_id IS NOT NULL
      AND sc.claimed_by_user_id IS NULL
      AND lower(sc.artist_name) = lower(v_req.artist_name)
  LOOP
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

  IF v_claims_created > 0 THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_req.user_id,
      'collab_auto_assigned',
      '🎶 Te hemos asignado colaboraciones',
      'Hemos detectado ' || v_claims_created || ' colaboración(es) en el catálogo a nombre de "' || v_req.artist_name || '". Revísalas en tu panel de artista → Colaboraciones.',
      jsonb_build_object('artist_name', v_req.artist_name, 'count', v_claims_created)
    );

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
$$;

-- =========================================================================
-- 4) BACKFILL: arreglar a todos los artistas afectados (Romy y otros)
--    a) Crear artists faltantes para todas las artist_requests aprobadas
--    b) Crear artists faltantes para todas las collaboration_claims aprobadas
--    c) Asegurar rol "artist" para esos usuarios
-- =========================================================================

-- 4a) Backfill desde artist_requests aprobadas
INSERT INTO public.artists (name)
SELECT DISTINCT btrim(ar.artist_name)
FROM public.artist_requests ar
WHERE ar.status = 'approved'
  AND btrim(ar.artist_name) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.artists a
    WHERE lower(a.name) = lower(btrim(ar.artist_name))
  );

INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT ar.user_id, 'artist'::app_role
FROM public.artist_requests ar
WHERE ar.status = 'approved'
ON CONFLICT DO NOTHING;

-- 4b) Backfill desde collaboration_claims aprobadas
INSERT INTO public.artists (name)
SELECT DISTINCT btrim(cc.claimant_artist_name)
FROM public.collaboration_claims cc
WHERE cc.status = 'approved'
  AND btrim(cc.claimant_artist_name) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.artists a
    WHERE lower(a.name) = lower(btrim(cc.claimant_artist_name))
  );

INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT cc.claimant_user_id, 'artist'::app_role
FROM public.collaboration_claims cc
WHERE cc.status = 'approved'
ON CONFLICT DO NOTHING;

-- 4c) Crear artist_requests aprobadas faltantes para que user_owns_artist()
--     reconozca al reclamante como dueño del artista
INSERT INTO public.artist_requests (user_id, artist_name, status, reviewed_at, bio)
SELECT DISTINCT
  cc.claimant_user_id,
  btrim(cc.claimant_artist_name),
  'approved'::artist_request_status,
  COALESCE(cc.reviewed_at, now()),
  'Auto-creado al backfill de reclamaciones aprobadas'
FROM public.collaboration_claims cc
WHERE cc.status = 'approved'
  AND btrim(cc.claimant_artist_name) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.artist_requests ar
    WHERE ar.user_id = cc.claimant_user_id
      AND lower(ar.artist_name) = lower(btrim(cc.claimant_artist_name))
      AND ar.status = 'approved'
  );