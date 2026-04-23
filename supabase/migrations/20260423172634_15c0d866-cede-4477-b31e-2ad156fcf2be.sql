-- 1. Enum de áreas del equipo
DO $$ BEGIN
  CREATE TYPE public.staff_area AS ENUM (
    'catalog',
    'users',
    'artist_requests',
    'qr_cards',
    'monetization',
    'settings'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Tabla de permisos de equipo (un usuario -> varias áreas)
CREATE TABLE IF NOT EXISTS public.staff_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  area public.staff_area NOT NULL,
  granted_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, area)
);

CREATE INDEX IF NOT EXISTS idx_staff_permissions_user ON public.staff_permissions(user_id);

-- 3. RLS
ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins manage staff permissions" ON public.staff_permissions;
CREATE POLICY "Super admins manage staff permissions"
ON public.staff_permissions
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view their own staff permissions" ON public.staff_permissions;
CREATE POLICY "Users can view their own staff permissions"
ON public.staff_permissions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 4. Helper: ¿este usuario tiene acceso a esta área?
-- Un super-admin (rol admin) tiene acceso a TODO automáticamente.
CREATE OR REPLACE FUNCTION public.has_staff_area(_user_id UUID, _area public.staff_area)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.staff_permissions
      WHERE user_id = _user_id AND area = _area
    );
$$;

-- 5. Helper: lista de áreas del usuario actual (incluye 'all' implícito si es admin)
CREATE OR REPLACE FUNCTION public.get_my_staff_areas()
RETURNS TABLE (area public.staff_area)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  IF public.is_admin(v_uid) THEN
    RETURN QUERY
      SELECT unnest(enum_range(NULL::public.staff_area));
  ELSE
    RETURN QUERY
      SELECT sp.area FROM public.staff_permissions sp WHERE sp.user_id = v_uid;
  END IF;
END;
$$;