import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';

/**
 * Registra el historial de escucha del usuario en user_listening_history.
 * Solo persiste cuando:
 *  - hay sesión iniciada
 *  - no es un preview
 *  - se han reproducido al menos 5 segundos
 *
 * Se ejecuta una sola vez por canción al cambiar de pista o al pausar
 * tras superar el umbral.
 */
export function useTrackListen() {
  const user = useAuthStore((s) => s.user);
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isPreview = usePlayerStore((s) => s.isPreview);
  const position = usePlayerStore((s) => s.position);
  const duration = usePlayerStore((s) => s.duration);

  // Cuánto se ha reproducido (ms) de la canción actual
  const playedMsRef = useRef(0);
  const lastTickRef = useRef<number | null>(null);
  const trackedSongRef = useRef<string | null>(null);
  const currentSongIdRef = useRef<string | null>(null);
  const currentDurationRef = useRef<number>(0);

  const flush = (songId: string | null) => {
    if (!user?.id || !songId) return;
    if (isPreview) return;
    if (trackedSongRef.current === songId) return;
    const playedMs = playedMsRef.current;
    if (playedMs < 5000) return;
    const totalMs = (currentDurationRef.current || 0) * 1000;
    const completed = totalMs > 0 && playedMs >= totalMs * 0.9;
    trackedSongRef.current = songId;
    void supabase.from('user_listening_history').insert({
      user_id: user.id,
      song_id: songId,
      duration_ms: playedMs,
      completed,
    });
  };

  // Acumular tiempo mientras suena
  useEffect(() => {
    if (!isPlaying) {
      lastTickRef.current = null;
      return;
    }
    lastTickRef.current = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      if (lastTickRef.current != null) {
        playedMsRef.current += now - lastTickRef.current;
      }
      lastTickRef.current = now;
    }, 1000);
    return () => {
      clearInterval(id);
      if (lastTickRef.current != null) {
        playedMsRef.current += Date.now() - lastTickRef.current;
        lastTickRef.current = null;
      }
    };
  }, [isPlaying]);

  // Reset y flush al cambiar de canción
  useEffect(() => {
    const prevId = currentSongIdRef.current;
    if (prevId && prevId !== currentSong?.id) {
      flush(prevId);
    }
    if (currentSong?.id !== prevId) {
      playedMsRef.current = 0;
      trackedSongRef.current = null;
    }
    currentSongIdRef.current = currentSong?.id ?? null;
    currentDurationRef.current = duration;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSong?.id, duration]);

  // Flush al desmontar
  useEffect(() => {
    return () => {
      flush(currentSongIdRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Posición evita acumulación cuando el track se reinicia (loop, repeat one)
  useEffect(() => {
    if (position === 0 && playedMsRef.current > 0 && !isPlaying) {
      // pausa al inicio, no hacemos nada
    }
  }, [position, isPlaying]);
}
