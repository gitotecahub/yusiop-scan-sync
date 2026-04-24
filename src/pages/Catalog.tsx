import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Play, Pause, Download, Heart, Check, Search, Music, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { usePlayerStore } from '@/stores/playerStore';
import { useCreditsStore } from '@/stores/creditsStore';
import { logger } from '@/lib/logger';
import { formatMadrid, timeUntil } from '@/lib/madridTime';

interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration_seconds: number;
  cover_url?: string;
  preview_url?: string;
  track_url?: string;
  preview_start_seconds?: number;
}

const Catalog = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [songs, setSongs] = useState<Song[]>([]);
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloadedSongs, setDownloadedSongs] = useState<Set<string>>(new Set());
  const [highlightedSongId, setHighlightedSongId] = useState<string | null>(null);
  const [upcoming, setUpcoming] = useState<Array<{ id: string; title: string; artist_name: string; cover_url: string | null; scheduled_release_at: string }>>([]);
  const { currentSong, isPlaying, isPreview, setCurrentSong, setQueue, play, pause } = usePlayerStore();
  const { userCredits, setUserCredits, setLoading: setCreditsLoading } = useCreditsStore();
  

  // Function to load credits (from both user_credits and qr_cards owned by user)
  const loadUserCredits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;

      // 1) Legacy/physical: user_credits rows
      const { data: creditsRows } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_email', user.email)
        .eq('is_active', true)
        .gt('credits_remaining', 0)
        .gt('expires_at', new Date().toISOString())
        .order('scanned_at', { ascending: false });

      // 2) Digital/owned QR cards with remaining credits
      const { data: ownedCards } = await supabase
        .from('qr_cards')
        .select('card_type, download_credits')
        .or(`owner_user_id.eq.${user.id},activated_by.eq.${user.id}`)
        .gt('download_credits', 0);

      const totalLegacy = (creditsRows ?? []).reduce((s, r: any) => s + (r.credits_remaining ?? 0), 0);
      const totalOwned = (ownedCards ?? []).reduce((s, c: any) => s + (c.download_credits ?? 0), 0);
      const total = totalLegacy + totalOwned;

      if (total > 0) {
        const cardType =
          creditsRows?.[0]?.card_type ?? ownedCards?.[0]?.card_type ?? 'standard';
        const expires =
          creditsRows?.[0]?.expires_at ??
          new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
        setUserCredits({
          credits_remaining: total,
          card_type: cardType,
          expires_at: expires,
          is_active: true,
        });
      } else {
        setUserCredits(null);
      }
    } catch (error) {
      console.error('Error loading credits:', error);
    }
  };

  // Function to load downloaded songs
  const loadDownloadedSongs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: downloadsData } = await supabase
          .from('user_downloads')
          .select('song_id')
          .eq('user_id', user.id)
          .eq('hidden_from_library', false);
        
        if (downloadsData) {
          setDownloadedSongs(new Set(downloadsData.map(d => d.song_id)));
        }
      }
    } catch (error) {
      console.error('Error loading downloaded songs:', error);
    }
  };

  // Cargar canciones y créditos del usuario
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Cargar canciones
        const { data: songsData, error: songsError } = await supabase
          .from('songs')
          .select(`
            *,
            artists!inner(name),
            albums(title, cover_url)
          `)
          .order('created_at', { ascending: false });

        if (songsError) {
          console.error('Error fetching songs:', songsError);
        } else {
          // Cargar colaboradores (featuring) para componer "Artista ft Colab1, Colab2"
          const songIds = (songsData ?? []).map((s: any) => s.id);
          let collabsBySong = new Map<string, string[]>();
          if (songIds.length > 0) {
            const { data: collabsData } = await supabase
              .from('song_collaborators')
              .select('song_id, artist_name, is_primary, created_at')
              .in('song_id', songIds);
            (collabsData ?? []).forEach((c: any) => {
              if (c.is_primary) return; // El principal viene de songs.artists.name
              const list = collabsBySong.get(c.song_id) ?? [];
              list.push(c.artist_name);
              collabsBySong.set(c.song_id, list);
            });
          }

          const formattedSongs = songsData.map(song => {
            const primary = song.artists.name;
            const feats = collabsBySong.get(song.id) ?? [];
            const artistDisplay = feats.length > 0 ? `${primary} ft ${feats.join(', ')}` : primary;
            return {
              id: song.id,
              title: song.title,
              artist: artistDisplay,
              album: song.albums?.title,
              duration_seconds: song.duration_seconds,
              cover_url: song.cover_url || song.albums?.cover_url || 'https://picsum.photos/300/300?random=1',
              preview_url: song.preview_url,
              track_url: song.track_url,
              preview_start_seconds: (song as any).preview_start_seconds ?? 0,
            };
          });
          setSongs(formattedSongs);
          setFilteredSongs(formattedSongs);
        }

        // Cargar créditos
        await loadUserCredits();
        
        // Cargar canciones descargadas
        await loadDownloadedSongs();

        // Cargar próximos lanzamientos
        const { data: upcomingData } = await supabase.rpc('get_upcoming_releases');
        setUpcoming(((upcomingData ?? []) as any[]).map((u) => ({
          id: u.id,
          title: u.title,
          artist_name: u.artist_name,
          cover_url: u.cover_url,
          scheduled_release_at: u.scheduled_release_at,
        })));
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [setUserCredits]);

// Refresh credits and downloads when user navigates to catalog (e.g., after QR scan)
useEffect(() => {
  loadUserCredits();
  loadDownloadedSongs();
}, [location.pathname]);

// Scroll first, then highlight when coming from "Música Popular"
useEffect(() => {
  const id = location.state?.highlightSongId as string | undefined;
  if (!id) return;

  let attempts = 0;
  const maxAttempts = 30;
  const interval = setInterval(() => {
    attempts++;
    const el = document.getElementById(`song-${id}`);
    if (el) {
      clearInterval(interval);
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // After scroll starts, add highlight
      setTimeout(() => {
        setHighlightedSongId(id);
        // Remove highlight after 3 seconds
        setTimeout(() => setHighlightedSongId(null), 3000);
      }, 400);

      // Clear navigation state so it doesn't re-trigger
      navigate('.', { replace: true, state: {} });
    } else if (attempts >= maxAttempts) {
      clearInterval(interval);
    }
  }, 100);

  return () => clearInterval(interval);
}, [location.state, filteredSongs]);

  // Also refresh when the component mounts or when credits store changes
  useEffect(() => {
    if (!userCredits) {
      loadUserCredits();
      loadDownloadedSongs();
    }
  }, [userCredits]);

  // Filter songs based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredSongs(songs);
    } else {
      const filtered = songs.filter(song =>
        song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        song.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (song.album && song.album.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredSongs(filtered);
    }
  }, [searchTerm, songs]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPreview = (song: Song) => {
    const shouldUsePreview = !downloadedSongs.has(song.id);

    if (currentSong?.id === song.id && isPreview === shouldUsePreview) {
      if (isPlaying) {
        pause();
      } else {
        play();
      }
      return;
    }

    if (shouldUsePreview) {
      // Modo preview: una sola canción, sin cola
      setCurrentSong(song, true);
    } else {
      // Modo completo: cargar cola con las canciones descargadas visibles
      const playable = filteredSongs.filter((s) => downloadedSongs.has(s.id));
      const startIdx = playable.findIndex((s) => s.id === song.id);
      if (playable.length > 0 && startIdx >= 0) {
        setQueue(playable as any, startIdx, false);
      } else {
        setCurrentSong(song, false);
      }
    }
    play();
  };

  const handleDownload = async (song: Song) => {
    if (!userCredits || userCredits.credits_remaining <= 0) {
      toast.error('No tienes créditos disponibles. Escanea una tarjeta QR para obtener más.');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Debes iniciar sesión para descargar canciones');
        return;
      }

      // Server-side credit decrement & download registration (prevents client tampering)
      const { data, error } = await supabase.functions.invoke('decrement-credits', {
        body: { songId: song.id },
      });

      if (error || !data?.success) {
        toast.error(data?.error || 'Error al descargar la canción');
        return;
      }

      // Refrescar créditos desde servidor para respetar múltiples tarjetas y re-descargas
      await loadUserCredits();
      setDownloadedSongs(prev => new Set([...prev, song.id]));
      toast.success(`"${song.title}" se descargó correctamente`);
    } catch (error) {
      logger.error('Error downloading song');
      toast.error('Error al descargar la canción');
    }
  };


  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <p className="eyebrow mb-2">Sección 02</p>
          <h1 className="display-xl text-4xl">Catálogo</h1>
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-muted h-20 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="display-xl text-4xl">
          Catálogo<span className="vapor-text"></span>
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs">
          Descubre y descarga tu música favorita.
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.6} />
        <Input
          placeholder="Buscar título, artista o álbum…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="rounded-2xl border-border bg-input pl-11 h-12 text-sm focus-visible:ring-2 focus-visible:ring-primary/40"
        />
      </div>

      {/* Downloads remaining — blob card */}
      <div className="blob-card p-5">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow mb-1.5">Tu balance</p>
            <p className="display-xl text-5xl vapor-text leading-none">
              {String(userCredits?.credits_remaining ?? 0).padStart(2, '0')}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {userCredits && userCredits.credits_remaining > 0
                ? `descargas · tarjeta ${userCredits.card_type}`
                : 'Sin créditos disponibles'}
            </p>
          </div>
          <Button
            onClick={() => navigate('/store')}
            className="rounded-full vapor-bg text-primary-foreground hover:opacity-90 shadow-glow shrink-0"
          >
            Comprar tarjeta
          </Button>
        </div>
      </div>

      {/* Próximos lanzamientos */}
      {upcoming.length > 0 && !searchTerm && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            <h2 className="font-display text-sm font-bold uppercase tracking-wider">
              Próximos lanzamientos
            </h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
            {upcoming.map((u) => (
              <div
                key={u.id}
                className="snap-start shrink-0 w-44 rounded-2xl border border-primary/20 bg-card/40 overflow-hidden"
              >
                <div className="relative aspect-square bg-muted">
                  {u.cover_url ? (
                    <img src={u.cover_url} alt={u.title} className="w-full h-full object-cover blur-[1px] opacity-90" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <span className="inline-block rounded-full bg-primary/90 text-primary-foreground text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">
                      Próximamente
                    </span>
                  </div>
                </div>
                <div className="p-2.5">
                  <p className="font-display font-bold text-sm truncate">{u.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.artist_name}</p>
                  <p className="text-[10px] text-primary mt-1 tabular-nums">
                    {formatMadrid(u.scheduled_release_at)} · {timeUntil(u.scheduled_release_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Songs List */}
      <div>

        {filteredSongs.length === 0 && searchTerm ? (
          <div className="vapor-card p-10 text-center">
            <p className="text-muted-foreground text-sm">
              Sin resultados para "{searchTerm}"
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredSongs.map((song, idx) => {
              const isCurrentlyPlaying = currentSong?.id === song.id && isPlaying;
              const isDownloaded = downloadedSongs.has(song.id);
              const isHighlighted = highlightedSongId === song.id;

              return (
                <div
                  key={song.id}
                  id={`song-${song.id}`}
                  className={`flex items-center gap-3 p-2.5 pr-3 rounded-2xl border transition-all ${
                    isHighlighted
                      ? 'bg-primary/10 border-primary/50 shadow-glow'
                      : 'bg-card/40 border-border hover:border-primary/30 hover:bg-card'
                  }`}
                >
                  <span className="font-display text-[10px] font-bold text-muted-foreground tabular-nums w-5 shrink-0 text-center">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <img
                    src={song.cover_url}
                    alt={`${song.title} cover`}
                    className="w-12 h-12 object-cover rounded-xl shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-bold text-sm text-foreground truncate leading-tight">{song.title}</h3>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{song.artist}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5 tabular-nums tracking-wider">
                      {formatDuration(song.duration_seconds)}{song.album ? ` · ${song.album}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handlePlayPreview(song)}
                      className="h-9 w-9 rounded-full hover:bg-muted"
                    >
                      {isCurrentlyPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                    </Button>
                    <Button
                      size="icon"
                      onClick={() => handleDownload(song)}
                      disabled={!userCredits || userCredits.credits_remaining <= 0 || isDownloaded}
                      className={`h-9 w-9 rounded-full border-0 ${
                        isDownloaded
                          ? 'bg-muted text-primary'
                          : 'vapor-bg text-primary-foreground hover:opacity-90 shadow-glow'
                      }`}
                    >
                      {isDownloaded ? <Check className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Catalog;