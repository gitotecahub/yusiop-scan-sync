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
import { useCreditsStore } from '@/stores/creditsStore';
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
  const { incrementCredits } = useCreditsStore();

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

      // 2. Devolver crédito al usuario (user_credits por email)
      const userEmail = user.email;
      if (userEmail) {
        const { data: creditRow } = await supabase
          .from('user_credits')
          .select('id, credits_remaining, max_credits')
          .eq('user_email', userEmail)
          .eq('is_active', true)
          .order('scanned_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (creditRow) {
          const newRemaining = Math.min(
            creditRow.credits_remaining + 1,
            creditRow.max_credits
          );
          await supabase
            .from('user_credits')
            .update({ credits_remaining: newRemaining })
            .eq('id', creditRow.id);
          incrementCredits();
        }
      }

      // 3. Si está sonando, detener
      if (currentSong?.id === songToDelete.id) {
        stop();
      }

      // 4. Actualizar UI local
      setDownloads(prev => prev.filter(s => s.id !== songToDelete.id));
      setFavorites(prev => prev.filter(s => s.id !== songToDelete.id));
      toast.success(`"${songToDelete.title}" eliminada. Descarga disponible de nuevo.`);
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
        <Card className="yusiop-card">
          <CardContent className="p-8 text-center">
            <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No hay canciones en esta sección
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid gap-4">
        {songs.map((song) => {
          const isCurrentlyPlaying = currentSong?.id === song.id && isPlaying;
          
          return (
            <Card key={song.id} className="yusiop-card hover:bg-card/80 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                   {/* Cover */}
                   <div className="relative">
                     <img
                       src={song.cover_url}
                       alt={`${song.title} cover`}
                       className="w-16 h-16 rounded-lg object-cover"
                     />
                     <Button
                       size="sm"
                       className="absolute inset-0 m-auto w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center"
                       onClick={() => handlePlay(song)}
                     >
                       {isCurrentlyPlaying ? (
                         <Pause className="h-3 w-3" />
                       ) : (
                         <Play className="h-3 w-3" />
                       )}
                     </Button>
                   </div>

                  {/* Song Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">
                      {song.title}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {song.artist}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <span>{formatDuration(song.duration_seconds)}</span>
                      {showDate && (
                        <>
                          <span>•</span>
                          <span>{formatDate(song.downloaded_at)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleFavorite(song)}
                      className={`yusiop-button-ghost ${song.is_favorite ? 'text-primary' : ''}`}
                    >
                      <Heart className={`h-4 w-4 ${song.is_favorite ? 'fill-current' : ''}`} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(song)}
                      className="yusiop-button-ghost text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
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
    </div>
  );
};

export default Library;