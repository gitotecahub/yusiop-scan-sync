-- Tabla para notas internas del CRM (solo admins)
CREATE TABLE public.admin_user_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_user_id UUID NOT NULL,
  author_user_id UUID NOT NULL,
  note TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para consultas rápidas
CREATE INDEX idx_admin_user_notes_target ON public.admin_user_notes(target_user_id);
CREATE INDEX idx_admin_user_notes_created ON public.admin_user_notes(created_at DESC);

-- RLS
ALTER TABLE public.admin_user_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all notes"
ON public.admin_user_notes
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can create notes"
ON public.admin_user_notes
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()) AND author_user_id = auth.uid());

CREATE POLICY "Admins can update notes"
ON public.admin_user_notes
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete notes"
ON public.admin_user_notes
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Trigger de updated_at
CREATE TRIGGER trg_admin_user_notes_updated_at
BEFORE UPDATE ON public.admin_user_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();