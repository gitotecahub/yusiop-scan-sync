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

    const previewStart = currentSong?.preview_start_seconds ?? 0;

    const handleTimeUpdate = () => {
      const elapsed = isPreview ? Math.max(0, audio.currentTime - previewStart) : audio.currentTime;
      setPosition(Math.floor(elapsed));
      if (isPreview && elapsed >= 20) {
        audio.pause();
        audio.currentTime = previewStart;
        setPosition(0);
        pause();
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(isPreview ? 20 : Math.floor(audio.duration || 0));
      if (isPreview && previewStart > 0) {
        try { audio.currentTime = previewStart; } catch {}
      }
    };

    const handleCanPlay = () => {
      if (shouldAutoPlayRef.current) {
        shouldAutoPlayRef.current = false;
        if (isPreview && previewStart > 0 && audio.currentTime < previewStart) {
          try { audio.currentTime = previewStart; } catch {}
        }
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
  }, [isPreview, currentSong?.preview_start_seconds, setPosition, setDuration, pause]);

  // Cargar nueva canción cuando cambia el ID
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;

    if (loadedSongIdRef.current === currentSong.id) return;

    // En preview: si tenemos track_url y preview_start_seconds definido, usamos el track completo
    // y reproducimos desde ese punto. Si no, fallback al preview_url legado.
    const hasCustomPreview =
      isPreview &&
      typeof currentSong.preview_start_seconds === 'number' &&
      !!currentSong.track_url;
    const audioUrl = hasCustomPreview
      ? (currentSong.track_url as string)
      : (currentSong.preview_url || currentSong.track_url || '');
    if (!audioUrl) {
      console.warn('Canción sin URL de audio', currentSong);
      toast.error('Esta canción no tiene archivo de audio');
      pause();
      return;
    }

    loadedSongIdRef.current = currentSong.id;
    shouldAutoPlayRef.current = isPlaying;
    audio.src = audioUrl;
    audio.load();
  }, [currentSong?.id, currentSong?.preview_url, currentSong?.track_url, currentSong?.preview_start_seconds, isPreview, isPlaying, pause]);

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
