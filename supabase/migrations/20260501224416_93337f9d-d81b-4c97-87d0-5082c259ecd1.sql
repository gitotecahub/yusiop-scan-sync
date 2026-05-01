CREATE OR REPLACE FUNCTION public.notify_shared_item()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  sender_name TEXT;
  notif_type TEXT;
  notif_title TEXT;
  notif_body TEXT;
  song_title TEXT;
  artist_name TEXT;
  artist_only_name TEXT;
  extra JSONB := '{}'::jsonb;
BEGIN
  SELECT COALESCE(full_name, username, 'Tu amigo') INTO sender_name
    FROM public.profiles WHERE user_id = NEW.sender_id LIMIT 1;

  IF NEW.item_type = 'song' THEN
    SELECT s.title, a.name INTO song_title, artist_name
      FROM public.songs s
      LEFT JOIN public.artists a ON a.id = s.artist_id
      WHERE s.id = NEW.item_id
      LIMIT 1;

    notif_type := 'shared_song';
    notif_title := 'Nueva canción compartida';
    IF song_title IS NOT NULL AND artist_name IS NOT NULL THEN
      notif_body := COALESCE(sender_name, 'Tu amigo')
        || ' te ha compartido "' || song_title || '" de ' || artist_name;
    ELSIF song_title IS NOT NULL THEN
      notif_body := COALESCE(sender_name, 'Tu amigo')
        || ' te ha compartido "' || song_title || '"';
    ELSE
      notif_body := COALESCE(sender_name, 'Tu amigo') || ' te ha compartido una canción';
    END IF;
    extra := jsonb_build_object('song_title', song_title, 'artist_name', artist_name);

  ELSIF NEW.item_type = 'artist' THEN
    SELECT name INTO artist_only_name FROM public.artists WHERE id = NEW.item_id LIMIT 1;

    notif_type := 'shared_artist';
    notif_title := 'Nuevo artista compartido';
    IF artist_only_name IS NOT NULL THEN
      notif_body := COALESCE(sender_name, 'Tu amigo')
        || ' te ha compartido al artista ' || artist_only_name;
    ELSE
      notif_body := COALESCE(sender_name, 'Tu amigo') || ' te ha compartido un artista';
    END IF;
    extra := jsonb_build_object('artist_name', artist_only_name);

  ELSE
    notif_type := 'shared_card';
    notif_title := 'Tarjeta digital compartida';
    notif_body := COALESCE(sender_name, 'Tu amigo') || ' te ha compartido una tarjeta';
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (NEW.receiver_id, notif_type, notif_title, notif_body,
    jsonb_build_object(
      'shared_item_id', NEW.id,
      'sender_id', NEW.sender_id,
      'sender_name', sender_name,
      'item_type', NEW.item_type,
      'item_id', NEW.item_id,
      'message', NEW.message
    ) || extra);
  RETURN NEW;
END; $$;