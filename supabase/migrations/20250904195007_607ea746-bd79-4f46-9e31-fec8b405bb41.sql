-- Crear enum para tipo de tarjeta
CREATE TYPE public.card_type AS ENUM ('standard', 'premium');

-- Crear enum para rol de usuario
CREATE TYPE public.user_role AS ENUM ('user', 'admin');

-- Tabla de perfiles de usuario
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  downloads_remaining INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de artistas
CREATE TABLE public.artists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de álbumes
CREATE TABLE public.albums (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  cover_url TEXT,
  release_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de canciones
CREATE TABLE public.songs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  album_id UUID REFERENCES public.albums(id) ON DELETE SET NULL,
  duration_seconds INTEGER NOT NULL,
  preview_url TEXT,
  track_url TEXT,
  cover_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de tarjetas QR
CREATE TABLE public.qr_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  card_type card_type NOT NULL DEFAULT 'standard',
  download_credits INTEGER NOT NULL DEFAULT 5,
  is_activated BOOLEAN DEFAULT FALSE,
  activated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  activated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de descargas de usuario
CREATE TABLE public.user_downloads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  qr_card_id UUID NOT NULL REFERENCES public.qr_cards(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, song_id)
);

-- Tabla de favoritos
CREATE TABLE public.user_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, song_id)
);

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

-- Políticas RLS para artistas (lectura pública)
CREATE POLICY "Artists are publicly readable" 
ON public.artists FOR SELECT 
USING (true);

-- Políticas RLS para álbumes (lectura pública)
CREATE POLICY "Albums are publicly readable" 
ON public.albums FOR SELECT 
USING (true);

-- Políticas RLS para canciones (lectura pública)
CREATE POLICY "Songs are publicly readable" 
ON public.songs FOR SELECT 
USING (true);

-- Políticas RLS para tarjetas QR (solo lectura para activación)
CREATE POLICY "QR cards can be read for activation" 
ON public.qr_cards FOR SELECT 
USING (true);

CREATE POLICY "QR cards can be updated for activation" 
ON public.qr_cards FOR UPDATE 
USING (true);

-- Políticas RLS para descargas de usuario
CREATE POLICY "Users can view their own downloads" 
ON public.user_downloads FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own downloads" 
ON public.user_downloads FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Políticas RLS para favoritos
CREATE POLICY "Users can view their own favorites" 
ON public.user_favorites FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own favorites" 
ON public.user_favorites FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites" 
ON public.user_favorites FOR DELETE 
USING (auth.uid() = user_id);

-- Función para actualizar timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger para perfiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Función para crear perfil automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username', NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger para crear perfil al registrarse
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();