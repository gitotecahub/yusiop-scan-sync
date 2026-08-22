CREATE OR REPLACE FUNCTION public.guard_withdrawal_method_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.verification_status IN ('verified','rejected')
     AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Los metodos de cobro solo pueden ser verificados por administradores';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_guard_withdrawal_method_insert
BEFORE INSERT ON public.artist_withdrawal_methods
FOR EACH ROW EXECUTE FUNCTION public.guard_withdrawal_method_insert();