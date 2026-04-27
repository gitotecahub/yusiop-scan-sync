/**
 * Cola de sincronización para reproducciones offline.
 * Cuando el usuario reproduce una canción descargada estando sin conexión,
 * encolamos { song_id, played_at } en localStorage. Al volver online,
 * vaciamos la cola actualizando user_downloads.last_played_at en Supabase.
 */
import { supabase } from '@/integrations/supabase/client';

const QUEUE_KEY = 'yusiop:offline-plays-queue';

interface QueuedPlay {
  song_id: string;
  played_at: string; // ISO
}

const readQueue = (): QueuedPlay[] => {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeQueue = (q: QueuedPlay[]) => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {
    // noop
  }
};

/**
 * Registra una reproducción. Si hay conexión, la envía inmediatamente;
 * si no, la encola para sincronizar cuando vuelva la red.
 */
export const recordPlayback = async (songId: string): Promise<void> => {
  const playedAt = new Date().toISOString();

  if (typeof navigator !== 'undefined' && navigator.onLine) {
    const ok = await pushPlayback(songId, playedAt);
    if (ok) return;
  }

  // Offline o falló la red → encolar
  const queue = readQueue();
  // Reemplazar entrada existente por la más reciente de cada song_id
  const filtered = queue.filter((q) => q.song_id !== songId);
  filtered.push({ song_id: songId, played_at: playedAt });
  writeQueue(filtered);
};

const pushPlayback = async (songId: string, playedAt: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { error } = await supabase
      .from('user_downloads')
      .update({ last_played_at: playedAt })
      .eq('user_id', user.id)
      .eq('song_id', songId);
    return !error;
  } catch {
    return false;
  }
};

/**
 * Vacía la cola de reproducciones encoladas mientras estábamos offline.
 */
export const flushPlaybackQueue = async (): Promise<void> => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  const queue = readQueue();
  if (queue.length === 0) return;

  const remaining: QueuedPlay[] = [];
  for (const item of queue) {
    const ok = await pushPlayback(item.song_id, item.played_at);
    if (!ok) remaining.push(item);
  }
  writeQueue(remaining);
};

/**
 * Suscribe el flush automático a los eventos `online` del navegador.
 * Llamar una sola vez al iniciar la app.
 */
export const initPlaybackSync = (): void => {
  // Intento inicial
  void flushPlaybackQueue();
  if (typeof window === 'undefined') return;
  window.addEventListener('online', () => {
    void flushPlaybackQueue();
  });
};
