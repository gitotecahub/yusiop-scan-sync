import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/playerStore';

const AudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const { currentSong, isPlaying, isPreview, position, setPosition, setDuration, pause } = usePlayerStore();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setPosition(Math.floor(audio.currentTime));
    };

    const handleLoadedMetadata = () => {
      if (isPreview) {
        setDuration(20); // 20 seconds for preview
      } else {
        setDuration(Math.floor(audio.duration));
      }
    };

    const handleEnded = () => {
      pause();
      setPosition(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [isPreview, setPosition, setDuration, pause]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;

    // Use preview_url if available, otherwise use track_url for both preview and full playback
    const audioUrl = currentSong.preview_url || currentSong.track_url || '';
    audio.src = audioUrl;
    audio.currentTime = 0;
  }, [currentSong]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play().catch(console.error);
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  // Stop preview after 20 seconds
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isPreview || !isPlaying) return;

    const checkPreviewTime = () => {
      if (audio.currentTime >= 20) {
        pause();
        setPosition(0);
        audio.currentTime = 0;
      }
    };

    const interval = setInterval(checkPreviewTime, 100);

    return () => clearInterval(interval);
  }, [isPreview, isPlaying, pause, setPosition]);

  return (
    <audio
      ref={audioRef}
      preload="metadata"
      style={{ display: 'none' }}
    />
  );
};

export default AudioPlayer;