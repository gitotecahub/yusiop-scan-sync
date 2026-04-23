-- 1) Añadir 'artist' al enum app_role (si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'artist'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'artist';
  END IF;
END$$;

-- 2) Enum para estado de la solicitud de artista
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'artist_request_status') THEN
    CREATE TYPE public.artist_request_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END$$;

-- 3) Añadir columnas al perfil para preferencias de modo y estado de onboarding
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_choice_made boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preferred_mode text NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS last_used_mode text NOT NULL DEFAULT 'user';

-- 4) Tabla de solicitudes de artista
CREATE TABLE IF NOT EXISTS public.artist_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status public.artist_request_status NOT NULL DEFAULT 'pending',
  artist_name text NOT NULL,
  bio text,
  genre text,
  links jsonb DEFAULT '[]'::jsonb,
  document_urls jsonb DEFAULT '[]'::jsonb,
  contact_email text,
  rejection_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Solo una solicitud pendiente por usuario
CREATE UNIQUE INDEX IF NOT EXISTS artist_requests_one_pending_per_user
  ON public.artist_requests (user_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS artist_requests_user_id_idx ON public.artist_requests(user_id);
CREATE INDEX IF NOT EXISTS artist_requests_status_idx ON public.artist_requests(status);

-- 5) Trigger updated_at
DROP TRIGGER IF EXISTS update_artist_requests_updated_at ON public.artist_requests;
CREATE TRIGGER update_artist_requests_updated_at
  BEFORE UPDATE ON public.artist_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6) RLS
ALTER TABLE public.artist_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own artist requests" ON public.artist_requests;
CREATE POLICY "Users can view their own artist requests"
  ON public.artist_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own artist requests" ON public.artist_requests;
CREATE POLICY "Users can create their own artist requests"
  ON public.artist_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all artist requests" ON public.artist_requests;
CREATE POLICY "Admins can view all artist requests"
  ON public.artist_requests FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update artist requests" ON public.artist_requests;
CREATE POLICY "Admins can update artist requests"
  ON public.artist_requests FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete artist requests" ON public.artist_requests;
CREATE POLICY "Admins can delete artist requests"
  ON public.artist_requests FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 7) Bucket privado para documentos de verificación de artistas
INSERT INTO storage.buckets (id, name, public)
VALUES ('artist-documents', 'artist-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage: cada usuario sube/lee dentro de su carpeta {user_id}/...
DROP POLICY IF EXISTS "Users can upload their artist documents" ON storage.objects;
CREATE POLICY "Users can upload their artist documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'artist-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can read their artist documents" ON storage.objects;
CREATE POLICY "Users can read their artist documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'artist-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete their artist documents" ON storage.objects;
CREATE POLICY "Users can delete their artist documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'artist-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Admins can read all artist documents" ON storage.objects;
CREATE POLICY "Admins can read all artist documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'artist-documents'
    AND public.is_admin(auth.uid())
  );

-- 8) Función: aprobar solicitud (asigna rol 'artist' y crea/relaciona artist)
CREATE OR REPLACE FUNCTION public.approve_artist_request(p_request_id uuid)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_req public.artist_requests%ROWTYPE;
  v_user_email text;
BEGIN
  IF v_admin_id IS NULL OR NOT public.is_admin(v_admin_id) THEN
    RETURN QUERY SELECT false, 'No autorizado'::text;
    RETURN;
  END IF;

  SELECT * INTO v_req FROM public.artist_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Solicitud no encontrada'::text;
    RETURN;
  END IF;

  IF v_req.status <> 'pending' THEN
    RETURN QUERY SELECT false, 'La solicitud ya fue procesada'::text;
    RETURN;
  END IF;

  -- Asignar rol artist (si no lo tiene ya)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_req.user_id, 'artist')
  ON CONFLICT DO NOTHING;

  -- Marcar solicitud como aprobada
  UPDATE public.artist_requests
  SET status = 'approved',
      reviewed_by = v_admin_id,
      reviewed_at = now(),
      rejection_reason = NULL
  WHERE id = p_request_id;

  -- Notificación
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_req.user_id,
    'artist_request_approved',
    '🎤 ¡Eres artista en Yusiop!',
    'Tu solicitud ha sido aprobada. Ya puedes acceder al panel de artista.',
    jsonb_build_object('request_id', p_request_id)
  );

  RETURN QUERY SELECT true, 'Solicitud aprobada'::text;
END;
$$;

-- 9) Función: rechazar solicitud
CREATE OR REPLACE FUNCTION public.reject_artist_request(p_request_id uuid, p_reason text DEFAULT NULL)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_req public.artist_requests%ROWTYPE;
BEGIN
  IF v_admin_id IS NULL OR NOT public.is_admin(v_admin_id) THEN
    RETURN QUERY SELECT false, 'No autorizado'::text;
    RETURN;
  END IF;

  SELECT * INTO v_req FROM public.artist_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Solicitud no encontrada'::text;
    RETURN;
  END IF;

  IF v_req.status <> 'pending' THEN
    RETURN QUERY SELECT false, 'La solicitud ya fue procesada'::text;
    RETURN;
  END IF;

  UPDATE public.artist_requests
  SET status = 'rejected',
      reviewed_by = v_admin_id,
      reviewed_at = now(),
      rejection_reason = p_reason
  WHERE id = p_request_id;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_req.user_id,
    'artist_request_rejected',
    'Solicitud de artista rechazada',
    COALESCE('Motivo: ' || p_reason, 'Tu solicitud no ha sido aprobada esta vez.'),
    jsonb_build_object('request_id', p_request_id, 'reason', p_reason)
  );

  RETURN QUERY SELECT true, 'Solicitud rechazada'::text;
END;
$$;