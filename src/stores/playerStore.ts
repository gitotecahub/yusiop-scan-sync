import { create } from 'zustand';

interface Song {
  id: string;
  title: string;
  artist: string;
  duration_seconds: number;
  preview_url?: string;
  track_url?: string;
  cover_url?: string;
}

interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  isPreview: boolean;
  position: number;
  duration: number;
  
  setCurrentSong: (song: Song, isPreview?: boolean) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  setPosition: (position: number) => void;
  setDuration: (duration: number) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  currentSong: null,
  isPlaying: false,
  isPreview: false,
  position: 0,
  duration: 0,

  setCurrentSong: (song, isPreview = false) => set({
    currentSong: song,
    isPreview,
    position: 0,
    duration: isPreview ? 20 : song.duration_seconds
  }),

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  stop: () => set({ 
    isPlaying: false, 
    position: 0,
    currentSong: null 
  }),

  setPosition: (position) => set({ position }),
  setDuration: (duration) => set({ duration })
}));