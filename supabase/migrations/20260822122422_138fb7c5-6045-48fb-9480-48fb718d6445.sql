-- Protección de identidad de artista: solo administradores pueden modificar
-- verification_status, artist_id, verified_by y verified_at.
-- Esto cierra el vector que permite a un usuario autenticado apoderarse de un perfil
-- verificado y redirigir los earnings de otros artistas.

CREATE OR REPLACE FUNCTION public.guard_artist_profile_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
       OR NEW.artist_id IS DISTINCT FROM OLD.artist_id
       OR NEW.verified_by IS DISTINCT FROM OLD.verified_by
       OR NEW.verified_at IS DISTINCT FROM OLD.verified_at THEN
      RAISE EXCEPTION 'Solo administradores pueden modificar identidad o verificacion de artista';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_artist_profile_identity ON public.artist_profiles;

CREATE TRIGGER trg_guard_artist_profile_identity
  BEFORE UPDATE ON public.artist_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_artist_profile_identity();