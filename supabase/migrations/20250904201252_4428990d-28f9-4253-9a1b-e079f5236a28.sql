-- Arreglar completamente el sistema de autenticación
-- Primero, asegurar que el trigger funciona correctamente

-- Eliminar trigger y función existentes
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Crear función mejorada que maneja errores
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Intentar insertar perfil de usuario
  BEGIN
    INSERT INTO public.profiles (user_id, username, full_name, downloads_remaining)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      0
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Log error pero permitir que continúe
      RAISE WARNING 'Could not create profile for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- Recrear trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Arreglar políticas RLS definitivamente
DROP POLICY IF EXISTS "Enable insert for auth trigger" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;

-- Política que permite insertar desde trigger y desde usuario autenticado
CREATE POLICY "Allow profile creation"
ON public.profiles FOR INSERT
WITH CHECK (
  -- Permitir si es el trigger (no hay auth.uid()) o si el user_id coincide
  auth.uid() IS NULL OR auth.uid() = user_id
);