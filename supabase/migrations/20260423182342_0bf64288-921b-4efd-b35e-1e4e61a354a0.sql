-- Crear enum para roles de colaboración
DO $$ BEGIN
  CREATE TYPE public.collab_role AS ENUM ('featuring', 'producer', 'performer', 'composer', 'remix');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Añadir columna role
ALTER TABLE public.song_collaborators
  ADD COLUMN IF NOT EXISTS role public.collab_role NOT NULL DEFAULT 'featuring';