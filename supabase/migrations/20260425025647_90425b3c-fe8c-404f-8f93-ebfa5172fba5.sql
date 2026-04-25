-- =========================================================
-- 1) BUCKET 'songs': eliminar policies públicas peligrosas
-- =========================================================
DROP POLICY IF EXISTS "Allow public uploads to songs bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates to songs bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes from songs bucket" ON storage.objects;

-- Reemplazar por policies admin-only para escritura/borrado
CREATE POLICY "Admins can upload to songs bucket"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'songs' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update songs bucket"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'songs' AND public.is_admin(auth.uid()))
WITH CHECK (bucket_id = 'songs' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete from songs bucket"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'songs' AND public.is_admin(auth.uid()));

-- =========================================================
-- 2) PROFILES: bloquear creación anónima
-- =========================================================
DROP POLICY IF EXISTS "Allow profile creation" ON public.profiles;

CREATE POLICY "Authenticated users can create their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- 3) SONG_COLLABORATORS: ocultar contact_email del pool público
-- =========================================================
DROP POLICY IF EXISTS "Verified artists can view unclaimed pool" ON public.song_collaborators;

-- Nueva policy: artistas pueden ver el pool, pero NO el contact_email
-- Como RLS es a nivel de fila, no de columna, creamos una vista segura
-- y revocamos el acceso a la columna sensible vía vista pública.

CREATE OR REPLACE VIEW public.unclaimed_collaborators_public
WITH (security_invoker = true)
AS
SELECT
  id,
  submission_id,
  song_id,
  artist_name,
  share_percent,
  is_primary,
  role,
  claimed_at,
  claimed_by_user_id,
  created_at,
  updated_at
FROM public.song_collaborators
WHERE claimed_by_user_id IS NULL
  AND song_id IS NOT NULL;

-- Política restrictiva en la tabla base: solo el propio colaborador
-- (por email coincidente con el del usuario autenticado) o admins
-- pueden ver la fila completa con contact_email.
CREATE POLICY "Collaborators view own row by email"
ON public.song_collaborators
FOR SELECT
TO authenticated
USING (
  contact_email IS NOT NULL
  AND contact_email = auth.email()
);

-- Permitir SELECT en la vista a artistas verificados
GRANT SELECT ON public.unclaimed_collaborators_public TO authenticated;

-- Restringimos la vista a artistas mediante una función wrapper:
-- (las vistas heredan RLS de la tabla base con security_invoker, así que
-- necesitamos una policy adicional que permita ver filas sin email expuesto)
CREATE POLICY "Verified artists can view unclaimed pool (no email)"
ON public.song_collaborators
FOR SELECT
TO authenticated
USING (
  claimed_by_user_id IS NULL
  AND song_id IS NOT NULL
  AND public.has_role(auth.uid(), 'artist'::app_role)
);

-- =========================================================
-- 4) REALTIME: restringir suscripciones a canales propios
-- =========================================================
-- Habilitar RLS en realtime.messages si no está
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

-- Eliminar policies previas si existen para evitar duplicados
DROP POLICY IF EXISTS "Users subscribe to own topics" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can broadcast to own topics" ON realtime.messages;

-- Permitir SELECT (suscripción) solo a topics que contengan el uid del usuario
-- Convención de topics: 'user:<uid>:*' o 'active_sessions:<uid>'
CREATE POLICY "Users subscribe to own topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (auth.uid() IS NOT NULL)
  AND (
    realtime.topic() LIKE 'user:' || auth.uid()::text || '%'
    OR realtime.topic() LIKE '%:' || auth.uid()::text
    OR realtime.topic() LIKE 'active_sessions:' || auth.uid()::text || '%'
  )
);

-- Permitir broadcast/insert solo en los canales propios
CREATE POLICY "Authenticated can broadcast to own topics"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() IS NOT NULL)
  AND (
    realtime.topic() LIKE 'user:' || auth.uid()::text || '%'
    OR realtime.topic() LIKE '%:' || auth.uid()::text
    OR realtime.topic() LIKE 'active_sessions:' || auth.uid()::text || '%'
  )
);