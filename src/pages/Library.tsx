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
import { Play, Pause, Trash2, Heart, Music, Library as LibraryIcon, ShoppingBag, Send, CheckSquare, Square, X, MoreVertical, CreditCard, Download, WifiOff, HardDrive } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { usePlayerStore } from '@/stores/playerStore';
import { supabase } from '@/integrations/supabase/client';
import PlaybackControls from '@/components/PlaybackControls';
import MyCards from '@/components/MyCards';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { listOfflineSongs, deleteOfflineSong } from '@/lib/offlineStorage';
import { useLanguageStore } from '@/stores/languageStore';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { recordPlayback } from '@/lib/playbackSync';

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
  const { t } = useLanguageStore();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
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
  const [offlineIds, setOfflineIds] = useState<Set<string>>(new Set());
  const [storageBytes, setStorageBytes] = useState<number>(0);
  const online = useOnlineStatus();
  const { currentSong, isPlaying, isPreview, setCurrentSong, setQueue, play, pause, stop } = usePlayerStore();

  // Cargar canciones descargadas (online: BD; offline: IndexedDB)
  useEffect(() => {
    const objectUrls: string[] = [];

    const loadFromOffline = async (): Promise<DownloadedSong[]> => {
      const offline = await listOfflineSongs();
      return offline.map((rec) => {
        let cover_url: string | undefined;
        if (rec.cover_blob) {
          const url = URL.createObjectURL(rec.cover_blob);
          objectUrls.push(url);
          cover_url = url;
        }
        return {
          id: rec.id,
          title: rec.title,
          artist: rec.artist,
          duration_seconds: rec.duration_seconds,
          cover_url: cover_url || 'https://picsum.photos/300/300?random=1',
          downloaded_at: rec.downloaded_at,
          is_favorite: false,
          track_url: undefined,
          preview_url: undefined,
        } as DownloadedSong;
      });
    };

    const loadDownloadedSongs = async () => {
      try {
        // Si estamos offline, cargar directamente de IndexedDB
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          const offlineSongs = await loadFromOffline();
          setDownloads(offlineSongs);
          setFavorites([]);
          setLoading(false);
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          // Sin sesión, intentar mostrar al menos lo guardado offline
          const offlineSongs = await loadFromOffline();
          setDownloads(offlineSongs);
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
          .eq('hidden_from_library', false)
          .order('downloaded_at', { ascending: false });

        if (error) {
          console.error('Error loading downloads:', error);
          // Fallback a offline si la red falla
          const offlineSongs = await loadFromOffline();
          setDownloads(offlineSongs);
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
        // Último recurso: offline
        try {
          const offlineSongs = await loadFromOffline();
          setDownloads(offlineSongs);
        } catch {
          // noop
        }
      } finally {
        setLoading(false);
      }
    };

    loadDownloadedSongs();

    return () => {
      objectUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  // Calcular IDs disponibles offline + bytes ocupados
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const offline = await listOfflineSongs();
        if (cancelled) return;
        const ids = new Set(offline.map((r) => r.id));
        const bytes = offline.reduce(
          (acc, r) => acc + (r.audio_blob?.size || 0) + (r.cover_blob?.size || 0),
          0
        );
        setOfflineIds(ids);
        setStorageBytes(bytes);
      } catch {
        // noop
      }
    })();
    return () => { cancelled = true; };
  }, [downloads.length]);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

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

  const handlePlay = (song: DownloadedSong, list?: DownloadedSong[]) => {
    // Bloquear si estamos offline y la canción no está descargada localmente
    if (!online && !offlineIds.has(song.id)) {
      toast.error('Esta canción no está disponible offline');
      return;
    }
    if (currentSong?.id === song.id && !isPreview) {
      if (isPlaying) {
        pause();
      } else {
        play();
      }
    } else {
      // Establecer cola con la lista visible para habilitar prev/next/shuffle
      const queueList = list && list.length > 0 ? list : [song];
      const startIdx = queueList.findIndex((s) => s.id === song.id);
      setQueue(queueList, startIdx >= 0 ? startIdx : 0, false);
      play();
    }
    // Registrar reproducción (sync online o cola offline)
    void recordPlayback(song.id);
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
        toast.error(t('qr.mustLogin'));
        return;
      }

      // 1. Ocultar de la biblioteca (soft delete) — preserva la descarga en estadísticas
      const { error: deleteError } = await supabase
        .from('user_downloads')
        .update({ hidden_from_library: true })
        .eq('user_id', user.id)
        .eq('song_id', songToDelete.id);

      if (deleteError) {
        console.error('Error hiding download:', deleteError);
        toast.error(t('state.error'));
        return;
      }

      // 2. Si está sonando, detener
      if (currentSong?.id === songToDelete.id) {
        stop();
      }

      // 3. Borrar también el blob offline
      await deleteOfflineSong(songToDelete.id);

      // 4. Actualizar UI local
      setDownloads(prev => prev.filter(s => s.id !== songToDelete.id));
      setFavorites(prev => prev.filter(s => s.id !== songToDelete.id));
      toast.success(`"${songToDelete.title}" eliminada de tu biblioteca`);
    } catch (err) {
      console.error('Error in confirmDelete:', err);
      toast.error(t('state.error'));
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
        toast.error(t('qr.mustLogin'));
        return;
      }
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from('user_downloads')
        .update({ hidden_from_library: true })
        .eq('user_id', user.id)
        .in('song_id', ids);

      if (error) {
        console.error('Bulk delete error:', error);
        toast.error('No se pudieron eliminar todas las canciones');
        return;
      }

      if (currentSong && ids.includes(currentSong.id)) stop();

      // Borrar blobs offline en paralelo
      await Promise.all(ids.map((id) => deleteOfflineSong(id)));

      setDownloads((prev) => prev.filter((s) => !selectedIds.has(s.id)));
      setFavorites((prev) => prev.filter((s) => !selectedIds.has(s.id)));
      toast.success(`${ids.length} ${t('library.deleted')}`);
      setSelectedIds(new Set());
      setSelectionMode(false);
      setBulkDeleteOpen(false);
    } catch (err) {
      console.error('Bulk delete failed:', err);
      toast.error(t('state.error'));
    } finally {
      setBulkProcessing(false);
    }
  };

  const confirmBulkShare = async () => {
    if (selectedIds.size === 0) return;
    const username = bulkRecipient.trim().replace(/^@/, '');
    if (!username) {
      toast.error(t('library.recipientUser'));
      return;
    }
    if (username.length > 50) {
      toast.error(t('state.error'));
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
        toast.success(`${successCount} ${t('library.shared')} a @${username}`);
      } else if (successCount > 0) {
        toast.warning(`${successCount} enviadas, ${failed.length} fallaron`);
      } else {
        toast.error(t('state.error'));
      }

      setSelectedIds(new Set());
      setSelectionMode(false);
      setBulkShareOpen(false);
      setBulkRecipient('');
    } catch (err) {
      console.error('Bulk share failed:', err);
      toast.error(t('state.error'));
    } finally {
      setBulkProcessing(false);
    }
  };

  const confirmShare = async () => {
    if (!songToShare) return;
    const username = recipientUsername.trim().replace(/^@/, '');
    if (!username) {
      toast.error(t('library.recipientUser'));
      return;
    }
    if (username.length > 50) {
      toast.error(t('state.error'));
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
        toast.error(t('state.error'));
        return;
      }

      const result = Array.isArray(data) ? data[0] : data;
      if (!result?.success) {
        toast.error(result?.message || t('state.error'));
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
      toast.error(t('state.error'));
    } finally {
      setSharing(false);
    }
  };

  const SongList = ({ songs, showDate = false }: { songs: DownloadedSong[], showDate?: boolean }) => {
    if (songs.length === 0) {
      return (
        <div className="vapor-card p-10 text-center">
          <Music className="h-10 w-10 text-muted-foreground mx-auto mb-3" strokeWidth={1.4} />
          <p className="text-muted-foreground text-sm">{t('library.empty')}</p>
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
            {allVisibleSelected ? t('action.cancel') : t('library.selectAll')}
          </button>
        )}
        {songs.map((song, idx) => {
          const isCurrentlyPlaying = currentSong?.id === song.id && isPlaying;
          const isSelected = selectedIds.has(song.id);

          return (
            <div
              key={song.id}
              onClick={
                selectionMode
                  ? () => toggleSelected(song.id)
                  : () => handlePlay(song, songs)
              }
              role={selectionMode ? undefined : 'button'}
              tabIndex={selectionMode ? undefined : 0}
              onKeyDown={
                selectionMode
                  ? undefined
                  : (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handlePlay(song, songs);
                      }
                    }
              }
              className={cn(
                'flex items-center gap-3 p-2.5 pr-3 rounded-2xl border transition-colors cursor-pointer select-none',
                isSelected
                  ? 'bg-primary/10 border-primary/50 shadow-glow'
                  : 'bg-card/40 border-border hover:bg-card/60'
              )}
            >
              {selectionMode ? (
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleSelected(song.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0"
                  aria-label={isSelected ? t('action.cancel') : t('library.selectAll')}
                />
              ) : (
                <span className="font-display text-[10px] font-bold text-muted-foreground tabular-nums w-5 shrink-0 text-center">
                  {String(idx + 1).padStart(2, '0')}
                </span>
              )}
              <div className="relative shrink-0">
                <img
                  src={song.cover_url}
                  alt={`${song.title} cover`}
                  className="w-12 h-12 object-cover rounded-xl"
                />
                {isCurrentlyPlaying && (
                  <div className="absolute inset-0 m-auto h-9 w-9 rounded-full bg-black/45 backdrop-blur-[2px] ring-1 ring-white/20 flex items-center justify-center pointer-events-none">
                    <Pause className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-display font-bold text-sm text-foreground truncate leading-tight">{song.title}</h3>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{song.artist}</p>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70 mt-0.5 tabular-nums tracking-wider">
                  <span>{formatDuration(song.duration_seconds)}</span>
                  {showDate && (<><span>·</span><span>{formatDate(song.downloaded_at)}</span></>)}
                  {offlineIds.has(song.id) ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/15 text-primary tracking-wide">
                      <Download className="h-2.5 w-2.5" />
                      Offline
                    </span>
                  ) : !online ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive tracking-wide">
                      <WifiOff className="h-2.5 w-2.5" />
                      No disponible
                    </span>
                  ) : null}
                </div>
              </div>

              {!selectionMode && (
                <div className="flex items-center shrink-0" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
                        aria-label="Más opciones"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => handleToggleFavorite(song)}>
                        <Heart className={cn('h-4 w-4 mr-2', song.is_favorite && 'fill-current text-primary')} />
                        {song.is_favorite ? 'Quitar de favoritos' : 'Me gusta'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShareRequest(song)}>
                        <Send className="h-4 w-4 mr-2" />
                        {t('library.share')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDeleteRequest(song)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('library.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
          <p className="eyebrow mb-2">{t('library.title')}</p>
          <h1 className="display-xl text-4xl">{t('library.title')}</h1>
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="display-xl text-4xl">
            {t('library.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xs">
            {t('library.discoverMusic')}
          </p>
        </div>
        {downloads.length > 0 && (
          <Button
            variant={selectionMode ? 'default' : 'outline'}
            size="sm"
            onClick={toggleSelectionMode}
            className={cn(
              'rounded-full shrink-0',
              selectionMode && 'vapor-bg text-primary-foreground border-0 shadow-glow'
            )}
          >
            {selectionMode ? (
              <>
                <X className="h-4 w-4 mr-1.5" />
                {t('action.cancel')}
              </>
            ) : (
              <>
                <CheckSquare className="h-4 w-4 mr-1.5" />
                {t('library.selectAll')}
              </>
            )}
          </Button>
        )}
      </div>

      {/* Stats — blob cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="blob-card blob-card-aurora p-5">
          <p className="eyebrow mb-1.5">{t('library.downloads')}</p>
          <p className="display-xl text-4xl">{String(downloads.length).padStart(2, '0')}</p>
        </div>
        <div className="blob-card blob-card-sunset p-5">
          <p className="eyebrow mb-1.5">{t('library.favorites')}</p>
          <p className="display-xl text-4xl vapor-text">{String(favorites.length).padStart(2, '0')}</p>
        </div>
      </div>

      {/* Almacenamiento offline */}
      {offlineIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-card/40 border border-border">
          <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <HardDrive className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="eyebrow mb-0.5">Almacenamiento offline</p>
            <p className="text-sm font-semibold text-foreground">
              {offlineIds.size} canci{offlineIds.size === 1 ? 'ón' : 'ones'} · {formatBytes(storageBytes)}
            </p>
          </div>
        </div>
      )}
      <Tabs defaultValue={initialTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-card/40 border border-border rounded-full p-1 h-auto gap-1">
          <TabsTrigger
            value="all"
            className="rounded-full data-[state=active]:vapor-bg data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow py-2 text-xs font-bold tracking-wide"
          >
            {t('library.tab.all')}
          </TabsTrigger>
          <TabsTrigger
            value="recent"
            className="rounded-full data-[state=active]:vapor-bg data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow py-2 text-xs font-bold tracking-wide"
          >
            {t('library.tab.recent')}
          </TabsTrigger>
          <TabsTrigger
            value="favorites"
            className="rounded-full data-[state=active]:vapor-bg data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow py-2 text-xs font-bold tracking-wide"
          >
            {t('library.tab.favorites')}
          </TabsTrigger>
          <TabsTrigger
            value="cards"
            className="rounded-full data-[state=active]:vapor-bg data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow py-2 text-xs font-bold tracking-wide"
          >
            {t('library.tab.cards')}
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
          {/* Wallet recargable */}
          <button
            onClick={() => navigate('/wallet')}
            className="relative overflow-hidden w-full text-left rounded-2xl p-4 shadow-lg active:scale-[0.99] transition-transform"
            style={{
              background:
                'linear-gradient(135deg, hsl(258 90% 56%) 0%, hsl(220 90% 56%) 50%, hsl(180 80% 45%) 100%)',
            }}
          >
            <div className="absolute -top-8 -right-8 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-white/15 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-white/70">YUSIOP Wallet</p>
                <p className="text-sm font-semibold text-white">Mi saldo y movimientos</p>
              </div>
              <span className="text-white/80 text-xs">→</span>
            </div>
          </button>

          <Link
            to="/store"
            className="flex items-center justify-between p-4 rounded-2xl vapor-bg text-primary-foreground shadow-glow"
          >
            <div className="flex items-center gap-3">
              <ShoppingBag className="h-5 w-5" />
              <div>
                <p className="font-bold text-sm">{t('store.buy')}</p>
                <p className="text-xs opacity-80">{t('card.standard')} / {t('card.premium')}</p>
              </div>
            </div>
            <span className="text-xs font-bold">→</span>
          </Link>
          <MyCards />
        </TabsContent>
      </Tabs>

      {!selectionMode && <PlaybackControls />}

      {/* Barra de acciones múltiples */}
      {selectionMode && (
        <div className="fixed bottom-[88px] left-3 right-3 z-40">
          <div className="max-w-md mx-auto glass-strong shadow-vapor rounded-2xl p-3 flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="eyebrow vapor-text mb-0.5">{t('library.itemsSelected')}</p>
              <p className="font-display font-bold text-sm text-foreground">
                {selectedIds.size} {t('library.itemsSelected')}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={selectedIds.size === 0}
              onClick={() => { setBulkRecipient(''); setBulkShareOpen(true); }}
              className="rounded-full"
            >
              <Send className="h-4 w-4 mr-1.5" />
              {t('library.send')}
            </Button>
            <Button
              size="sm"
              disabled={selectedIds.size === 0}
              onClick={() => setBulkDeleteOpen(true)}
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 border-0"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              {t('library.delete')}
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={!!songToDelete} onOpenChange={(open) => !open && !deleting && setSongToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('library.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              "{songToDelete?.title}" — {t('library.confirmDeleteDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('action.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? t('state.loading') : t('library.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo borrado en lote */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={(open) => !open && !bulkProcessing && setBulkDeleteOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('library.confirmDelete')} ({selectedIds.size})</AlertDialogTitle>
            <AlertDialogDescription>
              {t('library.confirmDeleteDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkProcessing}>{t('action.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmBulkDelete(); }}
              disabled={bulkProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkProcessing ? t('state.loading') : t('library.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo envío en lote */}
      <AlertDialog open={bulkShareOpen} onOpenChange={(open) => !open && !bulkProcessing && setBulkShareOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('library.send')} ({selectedIds.size})</AlertDialogTitle>
            <AlertDialogDescription>
              {t('library.shareDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="bulk-recipient-username">{t('library.recipientUser')}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">@</span>
              <Input
                id="bulk-recipient-username"
                value={bulkRecipient}
                onChange={(e) => setBulkRecipient(e.target.value.replace(/^@/, ''))}
                placeholder="usuario"
                className="pl-7"
                maxLength={50}
                autoFocus
                disabled={bulkProcessing}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !bulkProcessing) {
                    e.preventDefault();
                    confirmBulkShare();
                  }
                }}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkProcessing}>{t('action.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmBulkShare(); }}
              disabled={bulkProcessing || !bulkRecipient.trim()}
            >
              {bulkProcessing ? t('state.loading') : t('library.send')}
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
            <AlertDialogTitle>{t('library.shareTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              "{songToShare?.title}" — {t('library.shareDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="recipient-username">{t('library.recipientUser')}</Label>
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
            <AlertDialogCancel disabled={sharing}>{t('action.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmShare(); }}
              disabled={sharing || !recipientUsername.trim()}
            >
              {sharing ? t('state.loading') : t('library.share')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Library;