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

  if (!currentSong || !isPlaying) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (newPosition: number[]) => {
    setPosition(newPosition[0]);
    const audioElement = document.querySelector('audio') as HTMLAudioElement;
    if (audioElement) {
      audioElement.currentTime = newPosition[0];
    }
  };

  const togglePlayPause = () => {
    if (isPlaying) pause();
    else play();
  };

  return (
    <div className="fixed bottom-24 left-3 right-3 z-40">
      <div className="glass-strong rounded-3xl p-3 max-w-md mx-auto space-y-2">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={currentSong.cover_url}
              alt={`${currentSong.title} cover`}
              className="w-12 h-12 rounded-xl object-cover"
            />
            <div className="absolute inset-0 rounded-xl ring-1 ring-white/20" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-foreground truncate text-sm">
              {currentSong.title}
            </h4>
            <p className="text-xs text-muted-foreground truncate">
              {currentSong.artist}
            </p>
          </div>
          <Button
            size="sm"
            onClick={togglePlayPause}
            className="h-11 w-11 rounded-full vapor-gradient text-primary-foreground shadow-glow border-0 hover:opacity-90"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
        </div>

        <div className="space-y-1">
          <Slider
            value={[position]}
            max={duration}
            step={1}
            onValueChange={handleSeek}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
            <span>{formatTime(position)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaybackControls;
