import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CarouselSong } from '@/components/SongCarousel';

export interface RecCarousel {
  key: string;
  title: string;
  songs: CarouselSong[];
}

/**
 * Recomendaciones personalizadas basadas en la actividad del usuario:
 * - descargas previas
 * - géneros más escuchados (vía songs.genre de su biblioteca)
 * - artistas relacionados (compartidos por otros usuarios que descargaron lo mismo)
 * - tendencias del país
 *
 * Todo client-side, sin exponer datos privados de otros usuarios.
 */
export function useRecommendations(userId: string | null, countryCode?: string | null) {
  const [carousels, setCarousels] = useState<RecCarousel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        // 1. Descargas del usuario
        const { data: myDl } = await supabase
          .from('user_downloads')
          .select('song_id, songs!inner(id, genre, artist_id)')
          .eq('user_id', userId)
          .limit(200);

        const ownedIds = new Set<string>((myDl || []).map((d: any) => d.song_id));
        const myGenres = Array.from(new Set((myDl || []).map((d: any) => d.songs.genre).filter(Boolean))) as string[];
        const myArtistIds = Array.from(new Set((myDl || []).map((d: any) => d.songs.artist_id).filter(Boolean))) as string[];

        const result: RecCarousel[] = [];

        const mapSongs = (rows: any[]): CarouselSong[] => rows
          .filter((s) => !ownedIds.has(s.id))
          .map((s) => ({
            id: s.id,
            title: s.title,
            artist: s.artists?.name || s.artist?.name || '',
            cover_url: s.cover_url || s.albums?.cover_url || `https://picsum.photos/300/300?random=${s.id}`,
          }));

        // 2. Más canciones del mismo estilo (géneros del user)
        if (myGenres.length > 0) {
          const { data } = await supabase
            .from('songs')
            .select('id, title, cover_url, artists!inner(name), albums(cover_url)')
            .in('genre', myGenres)
            .order('created_at', { ascending: false })
            .limit(20);
          const mapped = mapSongs(data || []).slice(0, 10);
          if (mapped.length) result.push({ key: 'genre', title: 'Más canciones de este estilo', songs: mapped });
        }

        // 3. Más del/los artista(s) que escuchas
        if (myArtistIds.length > 0) {
          const { data } = await supabase
            .from('songs')
            .select('id, title, cover_url, artists!inner(name), albums(cover_url)')
            .in('artist_id', myArtistIds)
            .order('created_at', { ascending: false })
            .limit(20);
          const mapped = mapSongs(data || []).slice(0, 10);
          if (mapped.length) result.push({ key: 'artists', title: 'Más de los artistas que escuchas', songs: mapped });
        }

        // 4. Tendencias en tu país (top descargas global como fallback)
        const { data: trend } = await supabase
          .from('user_downloads')
          .select('song_id, songs!inner(id, title, cover_url, artists!inner(name), albums(cover_url))')
          .limit(200);
        if (trend) {
          const counts: Record<string, { song: any; n: number }> = {};
          (trend || []).forEach((t: any) => {
            const id = t.songs.id;
            if (!counts[id]) counts[id] = { song: t.songs, n: 0 };
            counts[id].n++;
          });
          const top = Object.values(counts).sort((a, b) => b.n - a.n).map((x) => x.song);
          const mapped = mapSongs(top).slice(0, 10);
          if (mapped.length) result.push({
            key: 'trending',
            title: countryCode ? `Tendencias en ${countryCode}` : 'Tendencias',
            songs: mapped,
          });
        }

        // 5. Nuevos lanzamientos para ti (filtrado por géneros si hay)
        let newQ = supabase
          .from('songs')
          .select('id, title, cover_url, artists!inner(name), albums(cover_url)')
          .order('created_at', { ascending: false })
          .limit(20);
        if (myGenres.length > 0) newQ = newQ.in('genre', myGenres);
        const { data: news } = await newQ;
        const mappedNews = mapSongs(news || []).slice(0, 10);
        if (mappedNews.length) result.push({ key: 'new', title: 'Nuevos lanzamientos para ti', songs: mappedNews });

        if (!cancelled) setCarousels(result);
      } catch (e) {
        console.error('useRecommendations error', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [userId, countryCode]);

  return { carousels, loading };
}
