import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Play, Pause, Download, Heart, Check, Search } from 'lucide-react';
import { toast } from 'sonner';
import { usePlayerStore } from '@/stores/playerStore';
import { useCreditsStore } from '@/stores/creditsStore';
import { logger } from '@/lib/logger';

interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration_seconds: number;
  cover_url?: string;
  preview_url?: string;
  track_url?: string;
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
  const { currentSong, isPlaying, setCurrentSong, play, pause } = usePlayerStore();
  const { userCredits, setUserCredits, decrementCredits, setLoading: setCreditsLoading } = useCreditsStore();

  // Function to load credits
  const loadUserCredits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user?.email) {
        const { data: creditsData, error: creditsError } = await supabase
          .from('user_credits')
          .select('*')
          .eq('user_email', user.email)
          .eq('is_active', true)
          .gt('credits_remaining', 0)
          .gt('expires_at', new Date().toISOString())
          .order('scanned_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!creditsError && creditsData) {
          setUserCredits(creditsData);
        } else {
          setUserCredits(null);
        }
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
          .eq('user_id', user.id);
        
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
          `);

        if (songsError) {
          console.error('Error fetching songs:', songsError);
        } else {
          const formattedSongs = songsData.map(song => ({
            id: song.id,
            title: song.title,
            artist: song.artists.name,
            album: song.albums?.title,
            duration_seconds: song.duration_seconds,
            cover_url: song.cover_url || song.albums?.cover_url || 'https://picsum.photos/300/300?random=1',
            preview_url: song.preview_url,
            track_url: song.track_url
          }));
          setSongs(formattedSongs);
          setFilteredSongs(formattedSongs);
        }

        // Cargar créditos
        await loadUserCredits();
        
        // Cargar canciones descargadas
        await loadDownloadedSongs();
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
    if (currentSong?.id === song.id && isPlaying) {
      pause();
    } else {
      setCurrentSong(song, true); // true = preview mode
      play();
    }
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

      // Update local state from authoritative server response
      decrementCredits();
      setDownloadedSongs(prev => new Set([...prev, song.id]));
      toast.success(`"${song.title}" se descargó correctamente`);

      if (data.credits_remaining <= 0) {
        setUserCredits(null);
      }
    } catch (error) {
      logger.error('Error downloading song');
      toast.error('Error al descargar la canción');
    }
  };


  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Explora</p>
          <h1 className="font-display text-3xl font-bold">Catálogo</h1>
        </div>
        <div className="grid gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass rounded-3xl p-4 animate-pulse h-20" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Explora</p>
        <h1 className="font-display text-3xl font-bold">Catálogo</h1>
        <p className="text-sm text-muted-foreground">Descubre y descarga tu música favorita</p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
        <Input
          placeholder="Buscar por título, artista o álbum…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="yusiop-input pl-11"
        />
      </div>

      {/* Downloads remaining */}
      {userCredits && userCredits.credits_remaining > 0 && (
        <div className="relative overflow-hidden glass rounded-3xl p-4">
          <div className="absolute -top-12 -right-10 w-40 h-40 vapor-gradient rounded-full blur-3xl opacity-40" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Te quedan</p>
              <p className="font-display text-3xl font-bold vapor-text leading-none mt-1">
                {userCredits.credits_remaining}
              </p>
              <p className="text-xs text-muted-foreground mt-1">descargas · tarjeta {userCredits.card_type}</p>
            </div>
            <div className="w-14 h-14 rounded-2xl glass flex items-center justify-center">
              <Download className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>
      )}

      {/* Songs List */}
      <div className="space-y-3">
        {filteredSongs.length === 0 && searchTerm ? (
          <div className="glass rounded-3xl p-8 text-center">
            <p className="text-muted-foreground text-sm">
              No se encontraron canciones que coincidan con "{searchTerm}"
            </p>
          </div>
        ) : (
          filteredSongs.map((song) => {
          const isCurrentlyPlaying = currentSong?.id === song.id && isPlaying;
          const isDownloaded = downloadedSongs.has(song.id);
          const isHighlighted = highlightedSongId === song.id;

          return (
            <div
              key={song.id}
              id={`song-${song.id}`}
              className={`glass rounded-3xl p-3 transition-all duration-300 ${
                isHighlighted ? 'ring-2 ring-primary shadow-glow scale-[1.01]' : 'hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <img
                    src={song.cover_url}
                    alt={`${song.title} cover`}
                    className="w-14 h-14 rounded-2xl object-cover"
                  />
                  <div className="absolute inset-0 rounded-2xl ring-1 ring-white/20" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-foreground truncate">{song.title}</h3>
                  <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                  <p className="text-[10px] text-muted-foreground/80 mt-0.5 tabular-nums">
                    {formatDuration(song.duration_seconds)}{song.album ? ` · ${song.album}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handlePlayPreview(song)}
                    className="h-10 w-10 rounded-full glass border border-white/10 hover:bg-white/10"
                  >
                    {isCurrentlyPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="icon"
                    onClick={() => handleDownload(song)}
                    disabled={!userCredits || userCredits.credits_remaining <= 0 || isDownloaded}
                    className={`h-10 w-10 rounded-full border-0 ${isDownloaded ? 'bg-emerald-500/20 text-emerald-300' : 'vapor-gradient text-primary-foreground shadow-glow'}`}
                  >
                    {isDownloaded ? <Check className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          );
          })
        )}
      </div>
    </div>
  );
};

export default Catalog;