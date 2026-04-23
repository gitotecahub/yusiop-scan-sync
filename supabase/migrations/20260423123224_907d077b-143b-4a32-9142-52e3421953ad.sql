-- 1. Add username column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text;

-- 2. Backfill username for existing rows that don't have one (based on email prefix)
UPDATE public.profiles p
SET username = lower(regexp_replace(split_part(u.email, '@', 1), '[^a-z0-9_]', '', 'g')) || '_' || substr(p.user_id::text, 1, 6)
FROM auth.users u
WHERE p.user_id = u.id AND (p.username IS NULL OR p.username = '');

-- 3. Make username NOT NULL and UNIQUE
ALTER TABLE public.profiles
  ALTER COLUMN username SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_idx
  ON public.profiles (lower(username));

-- 4. Allow authenticated users to lookup other users' public profile fields (username + full_name)
DROP POLICY IF EXISTS "Authenticated users can lookup public profile fields" ON public.profiles;
CREATE POLICY "Authenticated users can lookup public profile fields"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- 5. Update handle_new_user trigger to ensure username is unique
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_base_username text;
  v_username text;
  v_suffix int := 0;
BEGIN
  v_base_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9_]', '', 'g'))
  );
  v_username := v_base_username;

  -- Ensure unique
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = lower(v_username)) LOOP
    v_suffix := v_suffix + 1;
    v_username := v_base_username || v_suffix::text;
  END LOOP;

  BEGIN
    INSERT INTO public.profiles (user_id, username, full_name, downloads_remaining)
    VALUES (
      NEW.id,
      v_username,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      0
    );
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Could not create profile for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

-- 6. Create trigger on auth.users if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Function to transfer a song between users (changes ownership; not a copy)
CREATE OR REPLACE FUNCTION public.transfer_song_to_user(
  p_song_id uuid,
  p_recipient_username text
)
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
BEGIN
  v_sender_id := auth.uid();
  IF v_sender_id IS NULL THEN
    RETURN QUERY SELECT false, 'Debes iniciar sesión'::text;
    RETURN;
  END IF;

  -- Find recipient by username (case-insensitive)
  SELECT user_id, username INTO v_recipient_id, v_recipient_email
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

  -- Get sender username for notification
  SELECT username INTO v_sender_username
  FROM public.profiles
  WHERE user_id = v_sender_id
  LIMIT 1;

  -- Get song info
  SELECT s.title, a.name INTO v_song_title, v_artist_name
  FROM public.songs s
  JOIN public.artists a ON a.id = s.artist_id
  WHERE s.id = p_song_id
  LIMIT 1;

  IF v_song_title IS NULL THEN
    RETURN QUERY SELECT false, 'Canción no encontrada'::text;
    RETURN;
  END IF;

  -- Lock sender's download row
  SELECT id INTO v_download_id
  FROM public.user_downloads
  WHERE user_id = v_sender_id AND song_id = p_song_id
  FOR UPDATE
  LIMIT 1;

  IF v_download_id IS NULL THEN
    RETURN QUERY SELECT false, 'No tienes esta canción en tu biblioteca'::text;
    RETURN;
  END IF;

  -- If recipient already has the song, do nothing (avoid duplicate)
  IF EXISTS (
    SELECT 1 FROM public.user_downloads
    WHERE user_id = v_recipient_id AND song_id = p_song_id
  ) THEN
    RETURN QUERY SELECT false, 'El destinatario ya tiene esta canción en su biblioteca'::text;
    RETURN;
  END IF;

  -- Get recipient email
  SELECT email INTO v_recipient_email FROM auth.users WHERE id = v_recipient_id;

  -- Transfer the download (change owner; song moves library)
  UPDATE public.user_downloads
  SET user_id = v_recipient_id,
      user_email = v_recipient_email,
      downloaded_at = now()
  WHERE id = v_download_id;

  -- Notify recipient
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