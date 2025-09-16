import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Pause, Download, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { usePlayerStore } from '@/stores/playerStore';
import { useCreditsStore } from '@/stores/creditsStore';

interface Song {
  id: string;
  title: string;
  artist: string;
  duration_seconds: number;
  cover_url?: string;
  preview_url?: string;
}

const Catalog = () => {
  const location = useLocation();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
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
            duration_seconds: song.duration_seconds,
            cover_url: song.cover_url || song.albums?.cover_url || 'https://picsum.photos/300/300?random=1',
            preview_url: song.preview_url
          }));
          setSongs(formattedSongs);
        }

        // Cargar créditos
        await loadUserCredits();
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [setUserCredits]);

  // Refresh credits when user navigates to catalog (e.g., after QR scan)
  useEffect(() => {
    loadUserCredits();
  }, [location.pathname, location.state]);

  // Also refresh when the component mounts or when credits store changes
  useEffect(() => {
    if (!userCredits) {
      loadUserCredits();
    }
  }, [userCredits]);

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Debes iniciar sesión para descargar canciones');
        return;
      }

      // Registrar la descarga
      const { error: downloadError } = await supabase
        .from('user_downloads')
        .insert({
          user_id: user.id,
          user_email: user.email,
          song_id: song.id,
          card_type: userCredits.card_type
        });

      if (downloadError) {
        toast.error('Error al registrar la descarga');
        return;
      }

      // Decrementar créditos en la base de datos
      const { error: updateError } = await supabase
        .from('user_credits')
        .update({ 
          credits_remaining: userCredits.credits_remaining - 1,
          is_active: userCredits.credits_remaining - 1 > 0
        })
        .eq('user_email', user.email!)
        .eq('is_active', true);

      if (updateError) {
        toast.error('Error al actualizar créditos');
        return;
      }

      // Actualizar estado local
      decrementCredits();
      
      toast.success(`"${song.title}" se descargó correctamente`);
      
      // Si no quedan créditos, actualizar el estado
      if (userCredits.credits_remaining - 1 <= 0) {
        setUserCredits(null);
      }
    } catch (error) {
      console.error('Error downloading song:', error);
      toast.error('Error al descargar la canción');
    }
  };


  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Catálogo</h1>
          <p className="text-muted-foreground">Cargando música...</p>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="yusiop-card animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-muted rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Catálogo</h1>
        <p className="text-muted-foreground">
          Descubre y descarga tu música favorita
        </p>
      </div>

      {/* Downloads remaining - Only show when user has active credits */}
      {userCredits && userCredits.credits_remaining > 0 && (
        <Card className="yusiop-card border-primary/20">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Te quedan</p>
            <p className="text-2xl font-bold text-primary">
              {userCredits.credits_remaining} descargas
            </p>
            <p className="text-xs text-muted-foreground">
              Tarjeta {userCredits.card_type} activa
            </p>
          </CardContent>
        </Card>
      )}

      {/* Songs List */}
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
                  </div>

                  {/* Song Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">
                      {song.title}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {song.artist}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDuration(song.duration_seconds)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePlayPreview(song)}
                      className="yusiop-button-outline"
                    >
                      {isCurrentlyPlaying ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleDownload(song)}
                      className="yusiop-button-primary"
                      disabled={!userCredits || userCredits.credits_remaining <= 0}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Catalog;