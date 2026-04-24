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
      queueIndex: idx >= 0 ? idx : get().queueIndex,
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
    const { queue, queueIndex, shuffle, repeat, isPreview } = get();
    if (!queue.length) return;

    let nextIdx: number;
    if (repeat === 'one') {
      nextIdx = queueIndex;
    } else if (shuffle) {
      nextIdx = pickShuffleIndex(queue.length, queueIndex);
    } else {
      nextIdx = queueIndex + 1;
      if (nextIdx >= queue.length) {
        if (repeat === 'all') nextIdx = 0;
        else {
          // No hay siguiente: detener en la última
          set({ isPlaying: false, position: 0 });
          return;
        }
      }
    }

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
    const { queue, queueIndex, shuffle, position, isPreview } = get();
    if (!queue.length) return;

    // Si llevamos más de 3s reproducidos, reiniciar la canción actual
    if (position > 3) {
      set({ position: 0 });
      const audioElement = document.querySelector('audio') as HTMLAudioElement | null;
      if (audioElement) audioElement.currentTime = 0;
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
