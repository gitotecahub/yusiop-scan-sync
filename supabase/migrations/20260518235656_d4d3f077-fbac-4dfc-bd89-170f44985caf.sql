
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
  v_birth_date date;
  v_parental_email text;
  v_parental_token text;
BEGIN
  v_base_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9_]', '', 'g'))
  );
  v_username := v_base_username;

  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = lower(v_username)) LOOP
    v_suffix := v_suffix + 1;
    v_username := v_base_username || v_suffix::text;
  END LOOP;

  BEGIN
    v_birth_date := NULLIF(NEW.raw_user_meta_data->>'birth_date','')::date;
  EXCEPTION WHEN OTHERS THEN
    v_birth_date := NULL;
  END;

  v_parental_email := NULLIF(NEW.raw_user_meta_data->>'parental_email','');
  v_parental_token := NULLIF(NEW.raw_user_meta_data->>'parental_token','');

  BEGIN
    INSERT INTO public.profiles (
      user_id, username, full_name, downloads_remaining,
      birth_date, parental_email, parental_verification_token
    )
    VALUES (
      NEW.id,
      v_username,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      0,
      v_birth_date,
      v_parental_email,
      v_parental_token
    );
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Could not create profile for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;
