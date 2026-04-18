import { usePlayerStore } from '@/stores/playerStore';
import { Slider } from '@/components/ui/slider';
import { Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PlaybackControls = () => {
  const {
    currentSong, isPlaying, position, duration,
    play, pause, setPosition
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
    if (audioElement) audioElement.currentTime = newPosition[0];
  };

  const togglePlayPause = () => { isPlaying ? pause() : play(); };

  return (
    <div className="fixed bottom-[72px] left-0 right-0 z-40 px-3">
      <div className="bg-card border border-border max-w-md mx-auto p-3">
        <div className="flex items-center gap-3">
          <img
            src={currentSong.cover_url}
            alt={`${currentSong.title} cover`}
            className="w-12 h-12 object-cover"
          />
          <div className="flex-1 min-w-0">
            <p className="eyebrow mb-0.5">Now playing</p>
            <h4 className="font-display font-bold text-foreground truncate text-sm leading-tight">
              {currentSong.title}
            </h4>
            <p className="text-[11px] text-muted-foreground truncate">
              {currentSong.artist}
            </p>
          </div>
          <Button
            size="sm"
            onClick={togglePlayPause}
            className="h-11 w-11 rounded-none bg-primary text-primary-foreground hover:bg-primary/90 border-0"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
        </div>

        <div className="mt-3 space-y-1.5">
          <Slider
            value={[position]}
            max={duration}
            step={1}
            onValueChange={handleSeek}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums tracking-wider">
            <span>{formatTime(position)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaybackControls;
