import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { toast } from 'sonner';

const AudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const loadedSongIdRef = useRef<string | null>(null);
  const { currentSong, isPlaying, isPreview, setPosition, setDuration, pause } = usePlayerStore();

  // Listeners de audio (una sola vez)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setPosition(Math.floor(audio.currentTime));
      // Cortar preview a los 20s
      if (isPreview && audio.currentTime >= 20) {
        audio.pause();
        audio.currentTime = 0;
        setPosition(0);
        pause();
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(isPreview ? 20 : Math.floor(audio.duration || 0));
    };

    const handleEnded = () => {
      pause();
      setPosition(0);
    };

    const handleError = () => {
      console.error('Audio error', audio.error);
      toast.error('No se pudo reproducir el audio');
      pause();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [isPreview, setPosition, setDuration, pause]);

  // Cargar nueva canción cuando cambia
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;

    const audioUrl = currentSong.preview_url || currentSong.track_url || '';
    if (!audioUrl) {
      console.warn('Canción sin URL de audio', currentSong);
      toast.error('Esta canción no tiene archivo de audio');
      pause();
      return;
    }

    // Solo recargar si la canción cambió realmente
    if (loadedSongIdRef.current !== currentSong.id) {
      loadedSongIdRef.current = currentSong.id;
      audio.src = audioUrl;
      audio.currentTime = 0;
      audio.load();
    }
  }, [currentSong, pause]);

  // Play / pause según estado
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;

    if (isPlaying) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.error('Play failed:', err);
          toast.error('No se pudo iniciar la reproducción');
          pause();
        });
      }
    } else {
      audio.pause();
    }
  }, [isPlaying, currentSong, pause]);

  return (
    <audio
      ref={audioRef}
      preload="auto"
      crossOrigin="anonymous"
      style={{ display: 'none' }}
    />
  );
};

export default AudioPlayer;
