-- Bloquear que admins/moderadores obtengan o consuman créditos de descarga
-- Los admins deben usar otra cuenta para descargar música.

-- 1) Trigger en qr_cards: impedir que admin/moderador sea owner_user_id o activated_by
CREATE OR REPLACE FUNCTION public.prevent_admin_card_ownership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_user_id IS NOT NULL AND (
       public.has_role(NEW.owner_user_id, 'admin'::app_role)
       OR public.has_role(NEW.owner_user_id, 'moderator'::app_role)
     ) THEN
    RAISE EXCEPTION 'Los administradores no pueden poseer tarjetas QR. Usa una cuenta de usuario para descargar música.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.activated_by IS NOT NULL AND (
       public.has_role(NEW.activated_by, 'admin'::app_role)
       OR public.has_role(NEW.activated_by, 'moderator'::app_role)
     ) THEN
    RAISE EXCEPTION 'Los administradores no pueden activar tarjetas QR. Usa una cuenta de usuario para descargar música.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_admin_card_ownership ON public.qr_cards;
CREATE TRIGGER trg_prevent_admin_card_ownership
BEFORE INSERT OR UPDATE OF owner_user_id, activated_by ON public.qr_cards
FOR EACH ROW EXECUTE FUNCTION public.prevent_admin_card_ownership();

-- 2) Trigger en user_credits (legacy): impedir que admin/moderador tenga créditos
CREATE OR REPLACE FUNCTION public.prevent_admin_user_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = NEW.user_email;
  IF v_user_id IS NOT NULL AND (
       public.has_role(v_user_id, 'admin'::app_role)
       OR public.has_role(v_user_id, 'moderator'::app_role)
     ) THEN
    RAISE EXCEPTION 'Los administradores no pueden tener créditos de descarga. Usa una cuenta de usuario.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_admin_user_credits ON public.user_credits;
CREATE TRIGGER trg_prevent_admin_user_credits
BEFORE INSERT OR UPDATE ON public.user_credits
FOR EACH ROW EXECUTE FUNCTION public.prevent_admin_user_credits();

-- 3) Trigger en user_downloads: bloquear cualquier descarga registrada para admin/moderador
CREATE OR REPLACE FUNCTION public.prevent_admin_downloads()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := NEW.user_id;
  IF v_user_id IS NULL AND NEW.user_email IS NOT NULL THEN
    SELECT id INTO v_user_id FROM auth.users WHERE email = NEW.user_email;
  END IF;

  IF v_user_id IS NOT NULL AND (
       public.has_role(v_user_id, 'admin'::app_role)
       OR public.has_role(v_user_id, 'moderator'::app_role)
     ) THEN
    RAISE EXCEPTION 'Los administradores no pueden descargar música. Usa una cuenta de usuario para descargar.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_admin_downloads ON public.user_downloads;
CREATE TRIGGER trg_prevent_admin_downloads
BEFORE INSERT ON public.user_downloads
FOR EACH ROW EXECUTE FUNCTION public.prevent_admin_downloads();

-- 4) Limpieza: eliminar tarjetas y créditos de admins/moderadores existentes
UPDATE public.qr_cards
SET owner_user_id = NULL,
    activated_by = NULL,
    is_activated = false,
    activated_at = NULL,
    download_credits = CASE WHEN origin = 'physical' THEN download_credits ELSE 0 END
WHERE (owner_user_id IN (SELECT user_id FROM public.user_roles WHERE role IN ('admin','moderator')))
   OR (activated_by IN (SELECT user_id FROM public.user_roles WHERE role IN ('admin','moderator')));

UPDATE public.user_credits
SET is_active = false, credits_remaining = 0
WHERE user_email IN (
  SELECT u.email FROM auth.users u
  JOIN public.user_roles ur ON ur.user_id = u.id
  WHERE ur.role IN ('admin','moderator')
);