CREATE OR REPLACE FUNCTION public.transfer_card_to_user(p_card_id uuid, p_recipient_username text, p_gift_message text DEFAULT NULL)
 RETURNS TABLE(success boolean, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sender_id uuid;
  v_sender_username text;
  v_recipient_id uuid;
  v_recipient_email text;
  v_card public.qr_cards%ROWTYPE;
BEGIN
  v_sender_id := auth.uid();
  IF v_sender_id IS NULL THEN
    RETURN QUERY SELECT false, 'Debes iniciar sesión'::text;
    RETURN;
  END IF;

  -- Buscar destinatario por username
  SELECT user_id INTO v_recipient_id
  FROM public.profiles
  WHERE lower(username) = lower(trim(p_recipient_username))
  LIMIT 1;

  IF v_recipient_id IS NULL THEN
    RETURN QUERY SELECT false, 'No se encontró ningún usuario con ese username'::text;
    RETURN;
  END IF;

  IF v_recipient_id = v_sender_id THEN
    RETURN QUERY SELECT false, 'No puedes regalarte una tarjeta a ti mismo'::text;
    RETURN;
  END IF;

  -- Bloquear la tarjeta para evitar carreras
  SELECT * INTO v_card
  FROM public.qr_cards
  WHERE id = p_card_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Tarjeta no encontrada'::text;
    RETURN;
  END IF;

  -- Verificar propiedad (debe ser dueño o quien la activó)
  IF v_card.owner_user_id IS DISTINCT FROM v_sender_id
     AND v_card.activated_by IS DISTINCT FROM v_sender_id THEN
    RETURN QUERY SELECT false, 'No eres el propietario de esta tarjeta'::text;
    RETURN;
  END IF;

  -- Debe tener créditos disponibles
  IF v_card.download_credits <= 0 THEN
    RETURN QUERY SELECT false, 'No puedes regalar una tarjeta agotada'::text;
    RETURN;
  END IF;

  -- Obtener username del remitente
  SELECT username INTO v_sender_username
  FROM public.profiles
  WHERE user_id = v_sender_id
  LIMIT 1;

  -- Obtener email del destinatario
  SELECT email INTO v_recipient_email FROM auth.users WHERE id = v_recipient_id;

  -- Transferir propiedad de la tarjeta al destinatario
  UPDATE public.qr_cards
  SET owner_user_id = v_recipient_id,
      activated_by = v_recipient_id,
      activated_at = COALESCE(activated_at, now()),
      is_activated = true,
      is_gift = true,
      gift_recipient_email = v_recipient_email,
      gift_message = COALESCE(p_gift_message, gift_message),
      gift_redeemed = true,
      gift_redeemed_at = now()
  WHERE id = v_card.id;

  -- Notificación in-app al destinatario
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_recipient_id,
    'card_received',
    '🎁 Has recibido una tarjeta',
    '@' || COALESCE(v_sender_username, 'alguien') || ' te ha regalado una tarjeta ' || v_card.card_type || ' con ' || v_card.download_credits || ' descargas',
    jsonb_build_object(
      'qr_card_id', v_card.id,
      'card_type', v_card.card_type,
      'download_credits', v_card.download_credits,
      'sender_user_id', v_sender_id,
      'sender_username', v_sender_username,
      'gift_message', p_gift_message
    )
  );

  RETURN QUERY SELECT true, 'Tarjeta regalada a @' || (SELECT username FROM public.profiles WHERE user_id = v_recipient_id);
END;
$function$;