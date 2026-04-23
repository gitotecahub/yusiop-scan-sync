
-- Tabla para rastrear el dispositivo activo por usuario (sesión única)
CREATE TABLE IF NOT EXISTS public.active_sessions (
  user_id UUID NOT NULL PRIMARY KEY,
  device_id TEXT NOT NULL,
  device_info JSONB,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

-- Cada usuario puede ver y modificar SOLO su propio registro
CREATE POLICY "Users can view their own active session"
ON public.active_sessions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own active session"
ON public.active_sessions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own active session"
ON public.active_sessions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own active session"
ON public.active_sessions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Trigger para mantener updated_at actualizado
CREATE TRIGGER update_active_sessions_updated_at
BEFORE UPDATE ON public.active_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar Realtime para que cada cliente reciba el cambio al instante
ALTER PUBLICATION supabase_realtime ADD TABLE public.active_sessions;
ALTER TABLE public.active_sessions REPLICA IDENTITY FULL;
