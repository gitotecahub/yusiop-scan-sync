CREATE OR REPLACE FUNCTION public.transfer_song_to_user(p_song_id uuid, p_recipient_username text)
 RETURNS TABLE(success boolean, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sender_id uuid;
  v_sender_username text;
  v_recipient_id uuid;
  v_song_title text;
  v_artist_name text;
  v_download_id uuid;
  v_recipient_email text;
  v_existing_recipient_dl_id uuid;
  v_existing_recipient_hidden boolean;
BEGIN
  v_sender_id := auth.uid();
  IF v_sender_id IS NULL THEN
    RETURN QUERY SELECT false, 'Debes iniciar sesión'::text;
    RETURN;
  END IF;

  SELECT user_id INTO v_recipient_id
  FROM public.profiles
  WHERE lower(username) = lower(trim(p_recipient_username))
  LIMIT 1;

  IF v_recipient_id IS NULL THEN
    RETURN QUERY SELECT false, 'No se encontró ningún usuario con ese username'::text;
    RETURN;
  END IF;

  IF v_recipient_id = v_sender_id THEN
    RETURN QUERY SELECT false, 'No puedes compartir una canción contigo mismo'::text;
    RETURN;
  END IF;

  SELECT username INTO v_sender_username
  FROM public.profiles
  WHERE user_id = v_sender_id
  LIMIT 1;

  SELECT s.title, a.name INTO v_song_title, v_artist_name
  FROM public.songs s
  JOIN public.artists a ON a.id = s.artist_id
  WHERE s.id = p_song_id
  LIMIT 1;

  IF v_song_title IS NULL THEN
    RETURN QUERY SELECT false, 'Canción no encontrada'::text;
    RETURN;
  END IF;

  -- Localizar la descarga del remitente (sólo visible)
  SELECT id INTO v_download_id
  FROM public.user_downloads
  WHERE user_id = v_sender_id AND song_id = p_song_id AND hidden_from_library = false
  FOR UPDATE
  LIMIT 1;

  IF v_download_id IS NULL THEN
    RETURN QUERY SELECT false, 'No tienes esta canción en tu biblioteca'::text;
    RETURN;
  END IF;

  SELECT email INTO v_recipient_email FROM auth.users WHERE id = v_recipient_id;

  -- ¿El destinatario ya tiene un registro para esta canción?
  SELECT id, hidden_from_library
    INTO v_existing_recipient_dl_id, v_existing_recipient_hidden
  FROM public.user_downloads
  WHERE user_id = v_recipient_id AND song_id = p_song_id
  ORDER BY hidden_from_library ASC
  LIMIT 1
  FOR UPDATE;

  IF v_existing_recipient_dl_id IS NOT NULL THEN
    IF v_existing_recipient_hidden = false THEN
      RETURN QUERY SELECT false, 'El destinatario ya tiene esta canción en su biblioteca'::text;
      RETURN;
    END IF;

    -- Estaba oculta: la restauramos y descartamos el registro del remitente (oculto)
    UPDATE public.user_downloads
    SET hidden_from_library = false
    WHERE id = v_existing_recipient_dl_id;

    UPDATE public.user_downloads
    SET hidden_from_library = true
    WHERE id = v_download_id;
  ELSE
    -- Transferir propiedad de la descarga al destinatario sin actualizar downloaded_at
    UPDATE public.user_downloads
    SET user_id = v_recipient_id,
        user_email = v_recipient_email,
        hidden_from_library = false
    WHERE id = v_download_id;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_recipient_id,
    'song_received',
    'Has recibido una canción',
    '@' || COALESCE(v_sender_username, 'alguien') || ' te ha compartido "' || v_song_title || '" de ' || v_artist_name,
    jsonb_build_object(
      'song_id', p_song_id,
      'song_title', v_song_title,
      'artist_name', v_artist_name,
      'sender_user_id', v_sender_id,
      'sender_username', v_sender_username
    )
  );

  RETURN QUERY SELECT true, 'Canción compartida con @' || (SELECT username FROM public.profiles WHERE user_id = v_recipient_id);
END;
$function$;