import { useEffect } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { Slider } from '@/components/ui/slider';
import { Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PlaybackControls = () => {
  const { 
    currentSong, 
    isPlaying, 
    position, 
    duration, 
    play, 
    pause, 
    setPosition 
  } = usePlayerStore();

  // Solo mostrar si hay una canción actual Y está reproduciéndose
  if (!currentSong || !isPlaying) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (newPosition: number[]) => {
    setPosition(newPosition[0]);
    // También actualizar el tiempo del audio element
    const audioElement = document.querySelector('audio') as HTMLAudioElement;
    if (audioElement) {
      audioElement.currentTime = newPosition[0];
    }
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  return (
    <div className="fixed bottom-16 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 z-40">
      <div className="max-w-md mx-auto space-y-3">
        {/* Song info */}
        <div className="flex items-center space-x-3">
          <img
            src={currentSong.cover_url}
            alt={`${currentSong.title} cover`}
            className="w-12 h-12 rounded-lg object-cover"
          />
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-foreground truncate text-sm">
              {currentSong.title}
            </h4>
            <p className="text-xs text-muted-foreground truncate">
              {currentSong.artist}
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={togglePlayPause}
            className="h-10 w-10 rounded-full bg-primary/10 hover:bg-primary/20"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <Slider
            value={[position]}
            max={duration}
            step={1}
            onValueChange={handleSeek}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(position)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaybackControls;