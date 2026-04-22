import { useState } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, ChevronDown, SkipBack, SkipForward, Shuffle, Repeat, Heart, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';

const PlaybackControls = () => {
  const {
    currentSong, isPlaying, position, duration,
    play, pause, setPosition
  } = usePlayerStore();
  const [open, setOpen] = useState(false);

  if (!currentSong) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (newPosition: number[]) => {
    setPosition(newPosition[0]);
    const audioElement = document.querySelector('audio') as HTMLAudioElement;
    if (audioElement) audioElement.currentTime = newPosition[0];
  };

  const togglePlayPause = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    isPlaying ? pause() : play();
  };

  const remaining = Math.max(duration - position, 0);
  const progressPct = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      {/* Mini bar */}
      <div className="fixed bottom-[88px] left-3 right-3 z-40">
        <DrawerTrigger asChild>
          <button
            type="button"
            className="w-full text-left glass-strong shadow-vapor max-w-md mx-auto p-3 block rounded-2xl relative overflow-hidden"
            aria-label="Abrir reproductor"
          >
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-muted/40">
              <div className="h-full vapor-bg transition-all" style={{ width: `${progressPct}%` }} />
            </div>

            <div className="flex items-center gap-3">
              <img
                src={currentSong.cover_url}
                alt={`${currentSong.title} cover`}
                className="w-12 h-12 object-cover rounded-2xl shadow-glow"
              />
              <div className="flex-1 min-w-0">
                <p className="eyebrow mb-0.5 vapor-text">Now playing</p>
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
                className="h-11 w-11 rounded-full vapor-bg text-primary-foreground hover:opacity-90 border-0 shadow-glow shrink-0"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
              </Button>
            </div>
          </button>
        </DrawerTrigger>
      </div>

      {/* Reproductor expandido — más fino */}
      <DrawerContent className="border-0 bg-gradient-to-b from-background via-background to-card h-[80vh] focus:outline-none">
        <div className="mx-auto w-full max-w-md flex flex-col h-full px-5 pt-1 pb-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              className="h-9 w-9 rounded-full hover:bg-muted/40"
              aria-label="Minimizar"
            >
              <ChevronDown className="h-5 w-5" />
            </Button>
            <div className="text-center">
              <p className="eyebrow vapor-text">Reproduciendo</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full hover:bg-muted/40"
              aria-label="Compartir"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Carátula */}
          <div className="flex items-center justify-center my-3">
            <div className="relative w-full aspect-square max-w-[260px] rounded-2xl overflow-hidden shadow-vapor">
              <img
                src={currentSong.cover_url}
                alt={`${currentSong.title} cover`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 ring-1 ring-white/10 rounded-2xl pointer-events-none" />
            </div>
          </div>

          {/* Info */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0 flex-1">
              <h2 className="font-display font-bold text-xl text-foreground truncate leading-tight">
                {currentSong.title}
              </h2>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {currentSong.artist}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full hover:bg-muted/40 text-primary shrink-0"
              aria-label="Favorito"
            >
              <Heart className="h-5 w-5" />
            </Button>
          </div>

          {/* Slider Yusiop */}
          <div className="space-y-1.5 mb-5">
            <Slider
              value={[position]}
              max={duration || 1}
              step={1}
              onValueChange={handleSeek}
              className="yusiop-slider w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums tracking-[0.15em] uppercase">
              <span>{formatTime(position)}</span>
              <span>-{formatTime(remaining)}</span>
            </div>
          </div>

          {/* Controles */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full text-muted-foreground hover:text-primary hover:bg-muted/40"
              aria-label="Aleatorio"
            >
              <Shuffle className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-full text-foreground hover:bg-muted/40"
              aria-label="Anterior"
            >
              <SkipBack className="h-6 w-6 fill-current" />
            </Button>
            <Button
              size="icon"
              onClick={togglePlayPause}
              className="h-14 w-14 rounded-full vapor-bg text-primary-foreground hover:opacity-90 border-0 shadow-glow"
              aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
            >
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5 fill-current" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-full text-foreground hover:bg-muted/40"
              aria-label="Siguiente"
            >
              <SkipForward className="h-6 w-6 fill-current" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full text-muted-foreground hover:text-primary hover:bg-muted/40"
              aria-label="Repetir"
            >
              <Repeat className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default PlaybackControls;
