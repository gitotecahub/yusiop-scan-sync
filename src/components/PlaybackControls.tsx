import { useEffect, useState } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, ChevronDown, SkipBack, SkipForward, Shuffle, Repeat, Heart, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const PlaybackControls = () => {
  const {
    currentSong, isPlaying, position, duration,
    play, pause, setPosition,
    next, previous, shuffle, repeat, toggleShuffle, cycleRepeat, queue,
  } = usePlayerStore();
  const [open, setOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  // Cargar estado de favorito cuando cambia la canción
  useEffect(() => {
    let cancelled = false;
    const loadFavorite = async () => {
      if (!currentSong?.id) {
        setIsFavorite(false);
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setIsFavorite(false);
        return;
      }
      const { data } = await supabase
        .from('user_favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('song_id', currentSong.id)
        .maybeSingle();
      if (!cancelled) setIsFavorite(!!data);
    };
    loadFavorite();
    return () => { cancelled = true; };
  }, [currentSong?.id]);

  const toggleFavorite = async () => {
    if (!currentSong?.id || favoriteLoading) return;
    setFavoriteLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Inicia sesión para guardar favoritos');
        return;
      }
      if (isFavorite) {
        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('song_id', currentSong.id);
        if (error) throw error;
        setIsFavorite(false);
        toast.success('Eliminado de favoritos');
      } else {
        const { error } = await supabase
          .from('user_favorites')
          .insert({ user_id: user.id, song_id: currentSong.id });
        if (error) throw error;
        setIsFavorite(true);
        toast.success('Añadido a favoritos');
      }
    } catch (e: any) {
      console.error('toggle favorite failed', e);
      toast.error('No se pudo actualizar el favorito');
    } finally {
      setFavoriteLoading(false);
    }
  };

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

  const handleShare = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!currentSong) return;
    const shareUrl = `${window.location.origin}/catalog?song=${currentSong.id}`;
    const shareData = {
      title: currentSong.title,
      text: `🎵 Escucha "${currentSong.title}" de ${currentSong.artist} en Yusiop`,
      url: shareUrl,
    };
    try {
      if (navigator.share && typeof navigator.canShare === 'function' ? navigator.canShare(shareData) : !!navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(`${shareData.text} ${shareUrl}`);
      toast.success('Enlace copiado al portapapeles');
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(`${shareData.text} ${shareUrl}`);
        toast.success('Enlace copiado al portapapeles');
      } catch {
        toast.error('No se pudo compartir');
      }
    }
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
              onClick={handleShare}
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
              <h2 className="font-display font-bold text-3xl text-foreground truncate leading-[1.05] tracking-tight">
                {(() => {
                  const parts = currentSong.title.trim().split(/\s+/);
                  if (parts.length === 1) {
                    return <span className="vapor-text">{parts[0]}</span>;
                  }
                  const first = parts[0];
                  const rest = parts.slice(1).join(' ');
                  return (
                    <>
                      {first} <span className="vapor-text">{rest}</span>
                    </>
                  );
                })()}
              </h2>
              <p className="text-sm text-muted-foreground truncate mt-1 flex items-center gap-1.5">
                <span className="truncate">{currentSong.artist}</span>
                <span
                  className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full vapor-bg shrink-0"
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 12 12" className="w-2 h-2 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="2.5,6.5 5,9 9.5,3.5" />
                  </svg>
                </span>
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFavorite}
              disabled={favoriteLoading}
              className={cn(
                "h-9 w-9 rounded-full hover:bg-muted/40 shrink-0 transition-colors",
                isFavorite ? "text-destructive" : "text-primary"
              )}
              aria-label={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
              aria-pressed={isFavorite}
            >
              <Heart className={cn("h-5 w-5 transition-all", isFavorite && "fill-current")} />
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
              onClick={(e) => { e.stopPropagation(); toggleShuffle(); }}
              className={cn(
                "h-10 w-10 rounded-full hover:bg-muted/40 transition-colors",
                shuffle ? "text-primary" : "text-muted-foreground hover:text-primary"
              )}
              aria-label="Aleatorio"
              aria-pressed={shuffle}
            >
              <Shuffle className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); previous(); }}
              disabled={queue.length === 0}
              className="h-11 w-11 rounded-full text-foreground hover:bg-muted/40 disabled:opacity-40"
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
              onClick={(e) => { e.stopPropagation(); next(); }}
              disabled={queue.length === 0}
              className="h-11 w-11 rounded-full text-foreground hover:bg-muted/40 disabled:opacity-40"
              aria-label="Siguiente"
            >
              <SkipForward className="h-6 w-6 fill-current" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); cycleRepeat(); }}
              className={cn(
                "h-10 w-10 rounded-full hover:bg-muted/40 relative transition-colors",
                repeat !== 'off' ? "text-primary" : "text-muted-foreground hover:text-primary"
              )}
              aria-label="Repetir"
              aria-pressed={repeat !== 'off'}
            >
              <Repeat className="h-4 w-4" />
              {repeat === 'one' && (
                <span className="absolute -top-0.5 -right-0.5 text-[8px] font-bold bg-primary text-primary-foreground rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
                  1
                </span>
              )}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default PlaybackControls;
