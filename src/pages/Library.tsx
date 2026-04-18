import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Play, Pause, Trash2, Heart, Music } from 'lucide-react';
import { toast } from 'sonner';
import { usePlayerStore } from '@/stores/playerStore';
import { supabase } from '@/integrations/supabase/client';
import PlaybackControls from '@/components/PlaybackControls';

interface DownloadedSong {
  id: string;
  title: string;
  artist: string;
  duration_seconds: number;
  cover_url?: string;
  downloaded_at: string;
  is_favorite: boolean;
  track_url?: string;
  preview_url?: string;
}

const Library = () => {
  const [downloads, setDownloads] = useState<DownloadedSong[]>([]);
  const [favorites, setFavorites] = useState<DownloadedSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [songToDelete, setSongToDelete] = useState<DownloadedSong | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { currentSong, isPlaying, setCurrentSong, play, pause, stop } = usePlayerStore();

  // Cargar canciones descargadas desde Supabase
  useEffect(() => {
    const loadDownloadedSongs = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Obtener las descargas del usuario con información de la canción
        const { data: downloadsData, error } = await supabase
          .from('user_downloads')
          .select(`
            *,
            songs!inner(
              id,
              title,
              duration_seconds,
              cover_url,
              track_url,
              preview_url,
              artists!inner(name),
              albums(cover_url)
            )
          `)
          .eq('user_id', user.id)
          .order('downloaded_at', { ascending: false });

        if (error) {
          console.error('Error loading downloads:', error);
          setLoading(false);
          return;
        }

        const formattedSongs: DownloadedSong[] = downloadsData?.map(download => ({
          id: download.songs.id,
          title: download.songs.title,
          artist: download.songs.artists.name,
          duration_seconds: download.songs.duration_seconds,
          cover_url: download.songs.cover_url || download.songs.albums?.cover_url || 'https://picsum.photos/300/300?random=1',
          downloaded_at: download.downloaded_at,
          is_favorite: false, // TODO: implementar favoritos
          track_url: download.songs.track_url,
          preview_url: download.songs.preview_url
        })) || [];

        setDownloads(formattedSongs);
        setFavorites(formattedSongs.filter(song => song.is_favorite));
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDownloadedSongs();
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const handlePlay = (song: DownloadedSong) => {
    if (currentSong?.id === song.id) {
      if (isPlaying) {
        pause();
      } else {
        play();
      }
    } else {
      setCurrentSong(song, false); // false = full track, not preview
      play(); // Siempre reproducir la nueva canción
    }
  };

  const handleToggleFavorite = (song: DownloadedSong) => {
    const newFavoriteStatus = !song.is_favorite;
    
    // Actualizar en downloads
    setDownloads(prev => 
      prev.map(s => 
        s.id === song.id 
          ? { ...s, is_favorite: newFavoriteStatus }
          : s
      )
    );

    // Actualizar favoritos
    if (newFavoriteStatus) {
      setFavorites(prev => [...prev, { ...song, is_favorite: true }]);
      toast.success(`"${song.title}" agregada a favoritos`);
    } else {
      setFavorites(prev => prev.filter(s => s.id !== song.id));
      toast.success(`"${song.title}" removida de favoritos`);
    }
  };

  const handleDeleteRequest = (song: DownloadedSong) => {
    setSongToDelete(song);
  };

  const confirmDelete = async () => {
    if (!songToDelete) return;
    setDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Debes iniciar sesión');
        return;
      }

      // 1. Eliminar registro de descarga
      const { error: deleteError } = await supabase
        .from('user_downloads')
        .delete()
        .eq('user_id', user.id)
        .eq('song_id', songToDelete.id);

      if (deleteError) {
        console.error('Error deleting download:', deleteError);
        toast.error('No se pudo eliminar la canción');
        return;
      }

      // 2. Si está sonando, detener
      if (currentSong?.id === songToDelete.id) {
        stop();
      }

      // 3. Actualizar UI local
      setDownloads(prev => prev.filter(s => s.id !== songToDelete.id));
      setFavorites(prev => prev.filter(s => s.id !== songToDelete.id));
      toast.success(`"${songToDelete.title}" eliminada de tu biblioteca`);
    } catch (err) {
      console.error('Error in confirmDelete:', err);
      toast.error('Ocurrió un error al eliminar');
    } finally {
      setDeleting(false);
      setSongToDelete(null);
    }
  };

  const SongList = ({ songs, showDate = false }: { songs: DownloadedSong[], showDate?: boolean }) => {
    if (songs.length === 0) {
      return (
        <div className="glass rounded-3xl p-8 text-center">
          <Music className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No hay canciones en esta sección</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {songs.map((song) => {
          const isCurrentlyPlaying = currentSong?.id === song.id && isPlaying;

          return (
            <div key={song.id} className="glass rounded-3xl p-3 hover:bg-white/5 transition-all">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <img
                    src={song.cover_url}
                    alt={`${song.title} cover`}
                    className="w-14 h-14 rounded-2xl object-cover"
                  />
                  <Button
                    size="sm"
                    onClick={() => handlePlay(song)}
                    className="absolute inset-0 m-auto w-9 h-9 rounded-full vapor-gradient text-primary-foreground border-0 shadow-glow opacity-90"
                  >
                    {isCurrentlyPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
                  </Button>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-foreground truncate">{song.title}</h3>
                  <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                    <span>{formatDuration(song.duration_seconds)}</span>
                    {showDate && (<><span>·</span><span>{formatDate(song.downloaded_at)}</span></>)}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleToggleFavorite(song)}
                    className={`h-9 w-9 rounded-full hover:bg-white/10 ${song.is_favorite ? 'text-primary' : 'text-muted-foreground'}`}
                  >
                    <Heart className={`h-4 w-4 ${song.is_favorite ? 'fill-current' : ''}`} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDeleteRequest(song)}
                    className="h-9 w-9 rounded-full hover:bg-destructive/20 text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Mi Biblioteca</h1>
          <p className="text-muted-foreground">Cargando tu música...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Mi Biblioteca</h1>
        <p className="text-muted-foreground">
          Tu música descargada disponible offline
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="yusiop-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{downloads.length}</p>
            <p className="text-sm text-muted-foreground">Descargas</p>
          </CardContent>
        </Card>
        <Card className="yusiop-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{favorites.length}</p>
            <p className="text-sm text-muted-foreground">Favoritos</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">Todo</TabsTrigger>
          <TabsTrigger value="recent">Recientes</TabsTrigger>
          <TabsTrigger value="favorites">Favoritos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-6">
          <SongList songs={downloads} showDate={true} />
        </TabsContent>
        
        <TabsContent value="recent" className="mt-6">
          <SongList 
            songs={[...downloads].sort((a, b) => 
              new Date(b.downloaded_at).getTime() - new Date(a.downloaded_at).getTime()
            )} 
            showDate={true} 
          />
        </TabsContent>
        
        <TabsContent value="favorites" className="mt-6">
          <SongList songs={favorites} />
        </TabsContent>
      </Tabs>

      {/* Playback Controls */}
      <PlaybackControls />

      {/* Confirmación de eliminación */}
      <AlertDialog open={!!songToDelete} onOpenChange={(open) => !open && !deleting && setSongToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar de tu biblioteca?</AlertDialogTitle>
            <AlertDialogDescription>
              "{songToDelete?.title}" desaparecerá de tu biblioteca para siempre
              y perderás el crédito de descarga utilizado. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Library;