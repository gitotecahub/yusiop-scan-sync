-- 1) Crear el artista Kanteo para arreglar el caso actual
INSERT INTO public.artists (name)
SELECT 'Kanteo'
WHERE NOT EXISTS (
  SELECT 1 FROM public.artists WHERE lower(name) = lower('Kanteo')
);

-- 2) Actualizar approve_artist_request para crear el artista automáticamente
CREATE OR REPLACE FUNCTION public.approve_artist_request(p_request_id uuid)
 RETURNS TABLE(success boolean, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_admin_id uuid := auth.uid();
  v_req public.artist_requests%ROWTYPE;
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

  -- Asignar rol artist (si no lo tiene ya)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_req.user_id, 'artist')
  ON CONFLICT DO NOTHING;

  -- Crear el artista en el catálogo si aún no existe (case-insensitive)
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

  -- Notificación
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_req.user_id,
    'artist_request_approved',
    '🎤 ¡Eres artista en Yusiop!',
    'Tu solicitud ha sido aprobada. Ya puedes acceder al panel de artista.',
    jsonb_build_object('request_id', p_request_id)
  );

  RETURN QUERY SELECT true, 'Solicitud aprobada'::text;
END;
$function$;