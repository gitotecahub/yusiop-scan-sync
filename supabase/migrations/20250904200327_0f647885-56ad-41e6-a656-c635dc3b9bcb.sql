-- Insertar datos de prueba con UUIDs válidos
-- Primero insertamos algunos artistas
INSERT INTO public.artists (id, name, bio, avatar_url) VALUES 
(gen_random_uuid(), 'Queen', 'Banda británica de rock', 'https://picsum.photos/300/300?random=101'),
(gen_random_uuid(), 'Eagles', 'Banda estadounidense de rock', 'https://picsum.photos/300/300?random=102'),
(gen_random_uuid(), 'John Lennon', 'Músico y compositor británico', 'https://picsum.photos/300/300?random=103'),
(gen_random_uuid(), 'Michael Jackson', 'Rey del Pop', 'https://picsum.photos/300/300?random=104');

-- Obtener los IDs de artistas para usar en álbumes y canciones
DO $$
DECLARE
    queen_id UUID;
    eagles_id UUID;
    lennon_id UUID;
    jackson_id UUID;
    opera_id UUID;
    hotel_id UUID;
    imagine_id UUID;
    thriller_id UUID;
BEGIN
    -- Obtener IDs de artistas
    SELECT id INTO queen_id FROM public.artists WHERE name = 'Queen';
    SELECT id INTO eagles_id FROM public.artists WHERE name = 'Eagles';
    SELECT id INTO lennon_id FROM public.artists WHERE name = 'John Lennon';
    SELECT id INTO jackson_id FROM public.artists WHERE name = 'Michael Jackson';

    -- Insertar álbumes
    INSERT INTO public.albums (id, title, artist_id, cover_url, release_date) VALUES
    (gen_random_uuid(), 'A Night at the Opera', queen_id, 'https://picsum.photos/300/300?random=201', '1975-11-21'),
    (gen_random_uuid(), 'Hotel California', eagles_id, 'https://picsum.photos/300/300?random=202', '1976-12-08'),
    (gen_random_uuid(), 'Imagine', lennon_id, 'https://picsum.photos/300/300?random=203', '1971-09-09'),
    (gen_random_uuid(), 'Thriller', jackson_id, 'https://picsum.photos/300/300?random=204', '1982-11-30');

    -- Obtener IDs de álbumes
    SELECT id INTO opera_id FROM public.albums WHERE title = 'A Night at the Opera';
    SELECT id INTO hotel_id FROM public.albums WHERE title = 'Hotel California';
    SELECT id INTO imagine_id FROM public.albums WHERE title = 'Imagine';
    SELECT id INTO thriller_id FROM public.albums WHERE title = 'Thriller';

    -- Insertar canciones
    INSERT INTO public.songs (id, title, artist_id, album_id, duration_seconds, preview_url, track_url, cover_url) VALUES
    (gen_random_uuid(), 'Bohemian Rhapsody', queen_id, opera_id, 355, 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', 'https://picsum.photos/300/300?random=301'),
    (gen_random_uuid(), 'Hotel California', eagles_id, hotel_id, 391, 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', 'https://picsum.photos/300/300?random=302'),
    (gen_random_uuid(), 'Imagine', lennon_id, imagine_id, 183, 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', 'https://picsum.photos/300/300?random=303'),
    (gen_random_uuid(), 'Billie Jean', jackson_id, thriller_id, 294, 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', 'https://picsum.photos/300/300?random=304'),
    (gen_random_uuid(), 'We Will Rock You', queen_id, opera_id, 122, 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', 'https://picsum.photos/300/300?random=305'),
    (gen_random_uuid(), 'Beat It', jackson_id, thriller_id, 258, 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', 'https://picsum.photos/300/300?random=306');
END $$;

-- Insertar algunas tarjetas QR de prueba
INSERT INTO public.qr_cards (id, code, card_type, download_credits, is_activated) VALUES
(gen_random_uuid(), 'YUSIOP-STD-001', 'standard', 5, false),
(gen_random_uuid(), 'YUSIOP-STD-002', 'standard', 5, false),
(gen_random_uuid(), 'YUSIOP-PRM-001', 'premium', 10, false),
(gen_random_uuid(), 'YUSIOP-PRM-002', 'premium', 10, false),
(gen_random_uuid(), 'YUSIOP-STD-003', 'standard', 5, false);