import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { toast } from 'sonner';

const AudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const loadedSongIdRef = useRef<string | null>(null);
  const shouldAutoPlayRef = useRef<boolean>(false);

  const { currentSong, isPlaying, isPreview, setPosition, setDuration, pause } =
    usePlayerStore();

  // Listeners de audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setPosition(Math.floor(audio.currentTime));
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

    const handleCanPlay = () => {
      if (shouldAutoPlayRef.current) {
        shouldAutoPlayRef.current = false;
        audio.play().catch((err) => {
          console.error('Auto-play failed:', err);
          pause();
        });
      }
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
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [isPreview, setPosition, setDuration, pause]);

  // Cargar nueva canción cuando cambia el ID
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;

    if (loadedSongIdRef.current === currentSong.id) return;

    const audioUrl = currentSong.preview_url || currentSong.track_url || '';
    if (!audioUrl) {
      console.warn('Canción sin URL de audio', currentSong);
      toast.error('Esta canción no tiene archivo de audio');
      pause();
      return;
    }

    loadedSongIdRef.current = currentSong.id;
    // Si el store dice "playing" cuando cargamos, autoplay al estar listo
    shouldAutoPlayRef.current = isPlaying;
    audio.src = audioUrl;
    audio.load();
    // No llamamos play() aquí — esperamos al evento canplay
  }, [currentSong?.id, currentSong?.preview_url, currentSong?.track_url, isPlaying, pause]);

  // Play / pause cuando cambia el estado (sin tocar src ni currentTime)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;
    // Si la canción aún no está cargada, dejar que canplay haga el autoplay
    if (loadedSongIdRef.current !== currentSong.id) return;

    if (isPlaying) {
      if (audio.paused) {
        audio.play().catch((err) => {
          console.error('Play failed:', err);
          toast.error('No se pudo iniciar la reproducción');
          pause();
        });
      }
    } else {
      if (!audio.paused) audio.pause();
    }
  }, [isPlaying, currentSong?.id, pause]);

  return (
    <audio
      ref={audioRef}
      preload="auto"
      playsInline
      style={{ display: 'none' }}
    />
  );
};

export default AudioPlayer;
