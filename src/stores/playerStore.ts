import { create } from 'zustand';

interface Song {
  id: string;
  title: string;
  artist: string;
  duration_seconds: number;
  preview_url?: string;
  track_url?: string;
  cover_url?: string;
  preview_start_seconds?: number;
}

export type RepeatMode = 'off' | 'all' | 'one';

interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  isPreview: boolean;
  position: number;
  duration: number;

  queue: Song[];
  queueIndex: number;
  shuffle: boolean;
  repeat: RepeatMode;

  setCurrentSong: (song: Song, isPreview?: boolean) => void;
  setQueue: (songs: Song[], startIndex?: number, isPreview?: boolean) => void;
  next: () => void;
  previous: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;

  play: () => void;
  pause: () => void;
  stop: () => void;
  setPosition: (position: number) => void;
  setDuration: (duration: number) => void;
}

const pickShuffleIndex = (length: number, currentIdx: number): number => {
  if (length <= 1) return 0;
  let idx = Math.floor(Math.random() * length);
  if (idx === currentIdx) idx = (idx + 1) % length;
  return idx;
};

// Reinicia la pista actual respetando el inicio del preview.
const restartCurrent = (song: Song | null, isPreview: boolean) => {
  const audio = document.querySelector('audio') as HTMLAudioElement | null;
  if (!audio) return;
  const start = isPreview ? song?.preview_start_seconds ?? 0 : 0;
  const safe = Number.isFinite(audio.duration) && start + 1 >= audio.duration ? 0 : start;
  try { audio.currentTime = safe; } catch {}
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentSong: null,
  isPlaying: false,
  isPreview: false,
  position: 0,
  duration: 0,

  queue: [],
  queueIndex: -1,
  shuffle: false,
  repeat: 'off',

  setCurrentSong: (song, isPreview = false) => {
    const { queue } = get();
    // Localizar la canción dentro de la cola actual si existe
    const idx = queue.findIndex((s) => s.id === song.id);
    set({
      currentSong: song,
      isPreview,
      position: 0,
      duration: isPreview ? 20 : song.duration_seconds,
      // Si la canción no pertenece a la cola actual, se descarta la cola antigua
      // para que siguiente/anterior no salten a canciones de otra lista.
      ...(idx >= 0 ? { queueIndex: idx } : { queue: [], queueIndex: -1 }),
    });
  },

  setQueue: (songs, startIndex = 0, isPreview = false) => {
    if (!songs.length) {
      set({ queue: [], queueIndex: -1 });
      return;
    }
    const safeIdx = Math.max(0, Math.min(startIndex, songs.length - 1));
    const song = songs[safeIdx];
    set({
      queue: songs,
      queueIndex: safeIdx,
      currentSong: song,
      isPreview,
      position: 0,
      duration: isPreview ? 20 : song.duration_seconds,
    });
  },

  next: () => {
    const { queue, queueIndex, shuffle, isPreview, currentSong } = get();
    if (queue.length <= 1) {
      // Sin más canciones: reiniciar la actual para que el control responda
      restartCurrent(currentSong, isPreview);
      set({ position: 0 });
      return;
    }

    // Pulsar "siguiente" siempre avanza (aunque repetir-una esté activo);
    // al final de la lista vuelve a la primera.
    const nextIdx = shuffle
      ? pickShuffleIndex(queue.length, queueIndex)
      : (queueIndex + 1) % queue.length;

    const song = queue[nextIdx];
    set({
      queueIndex: nextIdx,
      currentSong: song,
      position: 0,
      duration: isPreview ? 20 : song.duration_seconds,
      isPlaying: true,
    });
  },

  previous: () => {
    const { queue, queueIndex, shuffle, position, isPreview, currentSong } = get();
    // Sin más canciones o con más de 3 s reproducidos: reiniciar la actual
    if (queue.length <= 1 || position > 3) {
      restartCurrent(currentSong, isPreview);
      set({ position: 0 });
      return;
    }

    let prevIdx: number;
    if (shuffle) {
      prevIdx = pickShuffleIndex(queue.length, queueIndex);
    } else {
      prevIdx = queueIndex - 1;
      if (prevIdx < 0) prevIdx = queue.length - 1;
    }

    const song = queue[prevIdx];
    set({
      queueIndex: prevIdx,
      currentSong: song,
      position: 0,
      duration: isPreview ? 20 : song.duration_seconds,
      isPlaying: true,
    });
  },

  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),

  cycleRepeat: () =>
    set((s) => ({
      repeat: s.repeat === 'off' ? 'all' : s.repeat === 'all' ? 'one' : 'off',
    })),

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  stop: () => set({
    isPlaying: false,
    position: 0,
    currentSong: null,
    queue: [],
    queueIndex: -1,
  }),

  setPosition: (position) => set({ position }),
  setDuration: (duration) => set({ duration })
}));
