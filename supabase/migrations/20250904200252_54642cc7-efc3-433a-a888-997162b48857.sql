-- Insertar datos de prueba para que puedas probar la app
-- Primero insertamos algunos artistas
INSERT INTO public.artists (id, name, bio, avatar_url) VALUES 
('11111111-1111-1111-1111-111111111111', 'Queen', 'Banda británica de rock', 'https://picsum.photos/300/300?random=101'),
('22222222-2222-2222-2222-222222222222', 'Eagles', 'Banda estadounidense de rock', 'https://picsum.photos/300/300?random=102'),
('33333333-3333-3333-3333-333333333333', 'John Lennon', 'Músico y compositor británico', 'https://picsum.photos/300/300?random=103'),
('44444444-4444-4444-4444-444444444444', 'Michael Jackson', 'Rey del Pop', 'https://picsum.photos/300/300?random=104');

-- Insertar algunos álbumes
INSERT INTO public.albums (id, title, artist_id, cover_url, release_date) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'A Night at the Opera', '11111111-1111-1111-1111-111111111111', 'https://picsum.photos/300/300?random=201', '1975-11-21'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Hotel California', '22222222-2222-2222-2222-222222222222', 'https://picsum.photos/300/300?random=202', '1976-12-08'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Imagine', '33333333-3333-3333-3333-333333333333', 'https://picsum.photos/300/300?random=203', '1971-09-09'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Thriller', '44444444-4444-4444-4444-444444444444', 'https://picsum.photos/300/300?random=204', '1982-11-30');

-- Insertar canciones
INSERT INTO public.songs (id, title, artist_id, album_id, duration_seconds, preview_url, track_url, cover_url) VALUES
('s1111111-1111-1111-1111-111111111111', 'Bohemian Rhapsody', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 355, 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', 'https://picsum.photos/300/300?random=301'),
('s2222222-2222-2222-2222-222222222222', 'Hotel California', '22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 391, 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', 'https://picsum.photos/300/300?random=302'),
('s3333333-3333-3333-3333-333333333333', 'Imagine', '33333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 183, 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', 'https://picsum.photos/300/300?random=303'),
('s4444444-4444-4444-4444-444444444444', 'Billie Jean', '44444444-4444-4444-4444-444444444444', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 294, 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', 'https://picsum.photos/300/300?random=304'),
('s5555555-5555-5555-5555-555555555555', 'We Will Rock You', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 122, 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', 'https://picsum.photos/300/300?random=305'),
('s6666666-6666-6666-6666-666666666666', 'Beat It', '44444444-4444-4444-4444-444444444444', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 258, 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', 'https://picsum.photos/300/300?random=306');

-- Insertar algunas tarjetas QR de prueba
INSERT INTO public.qr_cards (id, code, card_type, download_credits, is_activated) VALUES
('qr111111-1111-1111-1111-111111111111', 'YUSIOP-STD-001', 'standard', 5, false),
('qr222222-2222-2222-2222-222222222222', 'YUSIOP-STD-002', 'standard', 5, false),
('qr333333-3333-3333-3333-333333333333', 'YUSIOP-PRM-001', 'premium', 10, false),
('qr444444-4444-4444-4444-444444444444', 'YUSIOP-PRM-002', 'premium', 10, false),
('qr555555-5555-5555-5555-555555555555', 'YUSIOP-STD-003', 'standard', 5, false);

-- Verificar el trigger de creación de perfiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recrear la función de trigger de forma más robusta
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Si hay error, log pero no bloquear la creación del usuario
    RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Recrear el trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();