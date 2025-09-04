-- Arreglar las políticas RLS para la tabla profiles
-- Necesitamos permitir que el trigger de auth inserte datos

-- Eliminar la política restrictiva existente
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;

-- Crear una nueva política que permita INSERT desde el trigger
CREATE POLICY "Enable insert for auth trigger"
ON public.profiles FOR INSERT
WITH CHECK (true);

-- Mantener la política de lectura existente
-- (La política "Users can view their own profile" ya existe)

-- Mantener la política de actualización pero mejorarla
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);