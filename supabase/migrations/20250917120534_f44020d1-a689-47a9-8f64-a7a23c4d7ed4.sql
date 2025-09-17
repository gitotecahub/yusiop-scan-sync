-- Habilitar actualizaciones en tiempo real para la tabla user_credits
ALTER TABLE public.user_credits REPLICA IDENTITY FULL;

-- Agregar la tabla a la publicación de tiempo real
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE public.user_credits;