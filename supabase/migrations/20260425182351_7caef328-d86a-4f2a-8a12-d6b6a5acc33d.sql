CREATE OR REPLACE FUNCTION public.validate_collaborator_email()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_primary = true THEN
    NEW.contact_email := NULL;
    RETURN NEW;
  END IF;

  -- Para no-principales: obligatorio SOLO en INSERT (nuevas submissions).
  -- En UPDATE permitimos NULL para no romper aprobaciones de filas legacy
  -- creadas antes de exigir el email.
  IF TG_OP = 'INSERT' THEN
    IF NEW.contact_email IS NULL OR length(trim(NEW.contact_email)) = 0 THEN
      RAISE EXCEPTION 'contact_email es obligatorio para colaboradores no principales';
    END IF;
  END IF;

  -- Validar formato y normalizar SOLO si hay valor
  IF NEW.contact_email IS NOT NULL AND length(trim(NEW.contact_email)) > 0 THEN
    IF NEW.contact_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
      RAISE EXCEPTION 'contact_email tiene formato inválido';
    END IF;
    NEW.contact_email := lower(trim(NEW.contact_email));
  END IF;

  RETURN NEW;
END;
$$;