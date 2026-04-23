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
import { Play, Pause, Trash2, Heart, Music, Library as LibraryIcon, ShoppingBag, Send, CheckSquare, Square, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { usePlayerStore } from '@/stores/playerStore';
import { supabase } from '@/integrations/supabase/client';
import PlaybackControls from '@/components/PlaybackControls';
import MyCards from '@/components/MyCards';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

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
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab =
    tabParam === 'cards' || tabParam === 'recent' || tabParam === 'favorites' ? tabParam : 'all';
  const [downloads, setDownloads] = useState<DownloadedSong[]>([]);
  const [favorites, setFavorites] = useState<DownloadedSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [songToDelete, setSongToDelete] = useState<DownloadedSong | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [songToShare, setSongToShare] = useState<DownloadedSong | null>(null);
  const [recipientUsername, setRecipientUsername] = useState('');
  const [sharing, setSharing] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkShareOpen, setBulkShareOpen] = useState(false);
  const [bulkRecipient, setBulkRecipient] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const { currentSong, isPlaying, isPreview, setCurrentSong, play, pause, stop } = usePlayerStore();

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
    if (currentSong?.id === song.id && !isPreview) {
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

  const handleShareRequest = (song: DownloadedSong) => {
    setRecipientUsername('');
    setSongToShare(song);
  };

  const toggleSelectionMode = () => {
    setSelectionMode((prev) => {
      if (prev) setSelectedIds(new Set());
      return !prev;
    });
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = (ids: string[]) => {
    setSelectedIds((prev) => {
      const allSelected = ids.every((id) => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      }
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const confirmBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Debes iniciar sesión');
        return;
      }
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from('user_downloads')
        .delete()
        .eq('user_id', user.id)
        .in('song_id', ids);

      if (error) {
        console.error('Bulk delete error:', error);
        toast.error('No se pudieron eliminar todas las canciones');
        return;
      }

      if (currentSong && ids.includes(currentSong.id)) stop();

      setDownloads((prev) => prev.filter((s) => !selectedIds.has(s.id)));
      setFavorites((prev) => prev.filter((s) => !selectedIds.has(s.id)));
      toast.success(`${ids.length} ${ids.length === 1 ? 'canción eliminada' : 'canciones eliminadas'}`);
      setSelectedIds(new Set());
      setSelectionMode(false);
      setBulkDeleteOpen(false);
    } catch (err) {
      console.error('Bulk delete failed:', err);
      toast.error('Ocurrió un error al eliminar');
    } finally {
      setBulkProcessing(false);
    }
  };

  const confirmBulkShare = async () => {
    if (selectedIds.size === 0) return;
    const username = bulkRecipient.trim().replace(/^@/, '');
    if (!username) {
      toast.error('Escribe el username del destinatario');
      return;
    }
    if (username.length > 50) {
      toast.error('Username demasiado largo');
      return;
    }

    setBulkProcessing(true);
    const ids = Array.from(selectedIds);
    let successCount = 0;
    const failed: string[] = [];

    try {
      for (const id of ids) {
        const { data, error } = await supabase.rpc('transfer_song_to_user', {
          p_song_id: id,
          p_recipient_username: username,
        });
        const result = Array.isArray(data) ? data[0] : data;
        if (error || !result?.success) {
          failed.push(id);
        } else {
          successCount++;
        }
      }

      if (successCount > 0) {
        const transferredIds = ids.filter((id) => !failed.includes(id));
        if (currentSong && transferredIds.includes(currentSong.id)) stop();
        setDownloads((prev) => prev.filter((s) => !transferredIds.includes(s.id)));
        setFavorites((prev) => prev.filter((s) => !transferredIds.includes(s.id)));
      }

      if (failed.length === 0) {
        toast.success(`${successCount} ${successCount === 1 ? 'canción enviada' : 'canciones enviadas'} a @${username}`);
      } else if (successCount > 0) {
        toast.warning(`${successCount} enviadas, ${failed.length} fallaron`);
      } else {
        toast.error('No se pudo enviar ninguna canción');
      }

      setSelectedIds(new Set());
      setSelectionMode(false);
      setBulkShareOpen(false);
      setBulkRecipient('');
    } catch (err) {
      console.error('Bulk share failed:', err);
      toast.error('Ocurrió un error al compartir');
    } finally {
      setBulkProcessing(false);
    }
  };

  const confirmShare = async () => {
    if (!songToShare) return;
    const username = recipientUsername.trim().replace(/^@/, '');
    if (!username) {
      toast.error('Escribe el username del destinatario');
      return;
    }
    if (username.length > 50) {
      toast.error('Username demasiado largo');
      return;
    }

    setSharing(true);
    try {
      const { data, error } = await supabase.rpc('transfer_song_to_user', {
        p_song_id: songToShare.id,
        p_recipient_username: username,
      });

      if (error) {
        console.error('Share error:', error);
        toast.error('No se pudo compartir la canción');
        return;
      }

      const result = Array.isArray(data) ? data[0] : data;
      if (!result?.success) {
        toast.error(result?.message || 'No se pudo compartir');
        return;
      }

      // Si está sonando, detener (la canción ya no es nuestra)
      if (currentSong?.id === songToShare.id) {
        stop();
      }

      // Quitar la canción de nuestra biblioteca local
      setDownloads((prev) => prev.filter((s) => s.id !== songToShare.id));
      setFavorites((prev) => prev.filter((s) => s.id !== songToShare.id));
      toast.success(result.message);
      setSongToShare(null);
    } catch (err) {
      console.error('Error sharing song:', err);
      toast.error('Ocurrió un error al compartir');
    } finally {
      setSharing(false);
    }
  };

  const SongList = ({ songs, showDate = false }: { songs: DownloadedSong[], showDate?: boolean }) => {
    if (songs.length === 0) {
      return (
        <div className="vapor-card p-10 text-center">
          <Music className="h-10 w-10 text-muted-foreground mx-auto mb-3" strokeWidth={1.4} />
          <p className="text-muted-foreground text-sm">No hay canciones aquí todavía</p>
        </div>
      );
    }

    const visibleIds = songs.map((s) => s.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

    return (
      <div className="space-y-2">
        {selectionMode && (
          <button
            type="button"
            onClick={() => selectAllVisible(visibleIds)}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors px-1 py-1"
          >
            {allVisibleSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
            {allVisibleSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
          </button>
        )}
        {songs.map((song, idx) => {
          const isCurrentlyPlaying = currentSong?.id === song.id && isPlaying;
          const isSelected = selectedIds.has(song.id);

          return (
            <div
              key={song.id}
              onClick={selectionMode ? () => toggleSelected(song.id) : undefined}
              className={cn(
                'flex items-center gap-3 p-2.5 pr-3 rounded-2xl border transition-colors',
                selectionMode && 'cursor-pointer',
                isSelected
                  ? 'bg-primary/10 border-primary/50 shadow-glow'
                  : 'bg-card/40 border-border'
              )}
            >
              {selectionMode ? (
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleSelected(song.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0"
                  aria-label={isSelected ? 'Deseleccionar' : 'Seleccionar'}
                />
              ) : (
                <span className="font-display text-[10px] font-bold text-muted-foreground tabular-nums w-5 shrink-0 text-center">
                  {String(idx + 1).padStart(2, '0')}
                </span>
              )}
              <div className="relative shrink-0 group">
                <img
                  src={song.cover_url}
                  alt={`${song.title} cover`}
                  className="w-12 h-12 object-cover rounded-xl"
                />
                {!selectionMode && (
                  <Button
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handlePlay(song); }}
                    className="absolute inset-0 w-full h-full bg-transparent hover:bg-transparent active:bg-transparent text-white border-0 rounded-xl p-0 shadow-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]"
                  >
                    {isCurrentlyPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5 fill-current" />}
                  </Button>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-display font-bold text-sm text-foreground truncate leading-tight">{song.title}</h3>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{song.artist}</p>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70 mt-0.5 tabular-nums tracking-wider">
                  <span>{formatDuration(song.duration_seconds)}</span>
                  {showDate && (<><span>·</span><span>{formatDate(song.downloaded_at)}</span></>)}
                </div>
              </div>

              {!selectionMode && (
              <div className="flex items-center shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleToggleFavorite(song)}
                  className={`h-9 w-9 rounded-full hover:bg-muted ${song.is_favorite ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  <Heart className={`h-4 w-4 ${song.is_favorite ? 'fill-current' : ''}`} />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleShareRequest(song)}
                  className="h-9 w-9 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary"
                  aria-label="Compartir canción"
                >
                  <Send className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDeleteRequest(song)}
                  className="h-9 w-9 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <p className="eyebrow mb-2">Sección 03</p>
          <h1 className="display-xl text-4xl">Biblioteca</h1>
        </div>
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="bg-muted h-20 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32">
      {/* Header */}
      <div>
        <h1 className="display-xl text-4xl">
          Biblioteca
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs">
          Tu colección personal, lista para sonar.
        </p>
      </div>

      {/* Stats — blob cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="blob-card blob-card-aurora p-5">
          <p className="eyebrow mb-1.5">Descargas</p>
          <p className="display-xl text-4xl">{String(downloads.length).padStart(2, '0')}</p>
        </div>
        <div className="blob-card blob-card-sunset p-5">
          <p className="eyebrow mb-1.5">Favoritos</p>
          <p className="display-xl text-4xl vapor-text">{String(favorites.length).padStart(2, '0')}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={initialTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-card/40 border border-border rounded-full p-1 h-auto gap-1">
          <TabsTrigger
            value="all"
            className="rounded-full data-[state=active]:vapor-bg data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow py-2 text-xs font-bold tracking-wide"
          >
            Todo
          </TabsTrigger>
          <TabsTrigger
            value="recent"
            className="rounded-full data-[state=active]:vapor-bg data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow py-2 text-xs font-bold tracking-wide"
          >
            Recientes
          </TabsTrigger>
          <TabsTrigger
            value="favorites"
            className="rounded-full data-[state=active]:vapor-bg data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow py-2 text-xs font-bold tracking-wide"
          >
            Favs
          </TabsTrigger>
          <TabsTrigger
            value="cards"
            className="rounded-full data-[state=active]:vapor-bg data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow py-2 text-xs font-bold tracking-wide"
          >
            Tarjetas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-5">
          <SongList songs={downloads} showDate={true} />
        </TabsContent>

        <TabsContent value="recent" className="mt-5">
          <SongList
            songs={[...downloads].sort((a, b) =>
              new Date(b.downloaded_at).getTime() - new Date(a.downloaded_at).getTime()
            )}
            showDate={true}
          />
        </TabsContent>

        <TabsContent value="favorites" className="mt-5">
          <SongList songs={favorites} />
        </TabsContent>

        <TabsContent value="cards" className="mt-5 space-y-4">
          <Link
            to="/store"
            className="flex items-center justify-between p-4 rounded-2xl vapor-bg text-primary-foreground shadow-glow"
          >
            <div className="flex items-center gap-3">
              <ShoppingBag className="h-5 w-5" />
              <div>
                <p className="font-bold text-sm">Comprar tarjeta</p>
                <p className="text-xs opacity-80">Estándar o Premium · Regalo disponible</p>
              </div>
            </div>
            <span className="text-xs font-bold">→</span>
          </Link>
          <MyCards />
        </TabsContent>
      </Tabs>

      <PlaybackControls />

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
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!songToShare}
        onOpenChange={(open) => !open && !sharing && setSongToShare(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Compartir canción</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Quieres compartir <span className="font-semibold text-foreground">"{songToShare?.title}"</span>{' '}
              de <span className="font-semibold text-foreground">{songToShare?.artist}</span>?
              <br />
              <br />
              La canción <span className="font-semibold text-foreground">cambiará de biblioteca</span>: dejará la tuya y entrará directamente en la del destinatario. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="recipient-username">Username del destinatario</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">@</span>
              <Input
                id="recipient-username"
                value={recipientUsername}
                onChange={(e) => setRecipientUsername(e.target.value.replace(/^@/, ''))}
                placeholder="usuario"
                className="pl-7"
                maxLength={50}
                autoFocus
                disabled={sharing}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !sharing) {
                    e.preventDefault();
                    confirmShare();
                  }
                }}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sharing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmShare(); }}
              disabled={sharing || !recipientUsername.trim()}
            >
              {sharing ? 'Compartiendo...' : 'Compartir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Library;