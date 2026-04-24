-- 1. Añadir columna contact_email a song_collaborators
ALTER TABLE public.song_collaborators
  ADD COLUMN IF NOT EXISTS contact_email text;

-- 2. Trigger de validación: requerido para no-primarios
CREATE OR REPLACE FUNCTION public.validate_collaborator_email()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_primary = false THEN
    IF NEW.contact_email IS NULL OR length(trim(NEW.contact_email)) = 0 THEN
      RAISE EXCEPTION 'contact_email es obligatorio para colaboradores no principales';
    END IF;
    -- Validación básica de formato
    IF NEW.contact_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
      RAISE EXCEPTION 'contact_email tiene formato inválido';
    END IF;
    NEW.contact_email := lower(trim(NEW.contact_email));
  ELSE
    NEW.contact_email := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_collaborator_email_trigger ON public.song_collaborators;
CREATE TRIGGER validate_collaborator_email_trigger
  BEFORE INSERT OR UPDATE ON public.song_collaborators
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_collaborator_email();

-- 3. Función security-definer para resolver email -> user_id (sin exponer auth.users)
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1;
$$;

-- Solo accesible desde edge functions con service_role
REVOKE ALL ON FUNCTION public.get_user_id_by_email(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(text) TO service_role;