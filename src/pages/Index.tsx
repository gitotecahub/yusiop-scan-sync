import { Link, useNavigate } from 'react-router-dom';
import { QrCode, Music, Library, User, Play, Settings } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PopularSong {
  id: string;
  title: string;
  artist: string;
  cover_url: string;
  download_count: number;
}

const Index = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [popularSongs, setPopularSongs] = useState<PopularSong[]>([]);
  const [loading, setLoading] = useState(true);
  const navCards = [
    {
      title: 'Escanear QR',
      description: 'Activa tu tarjeta',
      icon: QrCode,
      link: '/qr',
      color: 'bg-primary'
    },
    {
      title: 'Catálogo',
      description: 'Explora música',
      icon: Music,
      link: '/catalog',
      color: 'bg-secondary'
    },
    {
      title: 'Mi Biblioteca',
      description: 'Tus descargas',
      icon: Library,
      link: '/library',
      color: 'bg-accent'
    },
    {
      title: 'Perfil',
      description: 'Tu cuenta',
      icon: User,
      link: '/profile',
      color: 'bg-muted'
    }
  ];

  // Cargar canciones más descargadas
  useEffect(() => {
    const fetchPopularSongs = async () => {
      try {
        const { data: popularData, error } = await supabase
          .from('user_downloads')
          .select(`
            song_id,
            songs!inner(
              id,
              title,
              cover_url,
              artists!inner(name),
              albums(cover_url)
            )
          `)
          .limit(100); // Obtener más datos para poder randomizar

        if (error) {
          console.error('Error fetching popular songs:', error);
          return;
        }

        // Contar descargas por canción
        const downloadCounts: { [key: string]: { song: any; count: number } } = {};
        
        popularData?.forEach((download) => {
          const songId = download.song_id;
          if (!downloadCounts[songId]) {
            downloadCounts[songId] = {
              song: download.songs,
              count: 0
            };
          }
          downloadCounts[songId].count++;
        });

        // Convertir a array y ordenar por descargas
        const songsArray = Object.values(downloadCounts)
          .sort((a, b) => b.count - a.count)
          .slice(0, 10) // Top 10 para randomizar
          .map(item => ({
            id: item.song.id,
            title: item.song.title,
            artist: item.song.artists.name,
            cover_url: item.song.cover_url || item.song.albums?.cover_url || 'https://picsum.photos/300/300?random=1',
            download_count: item.count
          }));

        // Randomizar y tomar 6
        const shuffled = songsArray.sort(() => 0.5 - Math.random());
        setPopularSongs(shuffled.slice(0, 6));
        
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPopularSongs();
  }, []);

  const handleSongClick = (songId: string) => {
    navigate('/catalog', { state: { highlightSongId: songId } });
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="text-center py-6">
        <h1 className="text-3xl font-bold mb-2 yusiop-gradient bg-clip-text text-transparent">
          Bienvenido a YUSIOP
        </h1>
        <p className="text-muted-foreground">
          Tu plataforma de música favorita
        </p>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-2 gap-4">
        {navCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.link} to={card.link}>
              <Card className="p-6 hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className={`${card.color} p-3 rounded-full`}>
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{card.title}</h3>
                    <p className="text-sm text-muted-foreground">{card.description}</p>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Admin Panel Access */}
      {isAdmin && (
        <div className="mt-6">
          <Link to="/admin">
            <Card className="p-4 bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-200 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center space-x-4">
                <div className="bg-red-500 p-3 rounded-full">
                  <Settings className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Panel de Administración</h3>
                  <p className="text-sm text-muted-foreground">
                    Gestiona usuarios, música y configuraciones
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        </div>
      )}

      {/* Music Preview Section */}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Música Popular</h2>
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="aspect-square animate-pulse">
                <div className="p-3 h-full flex flex-col">
                  <div className="flex-1 bg-muted rounded-lg mb-2" />
                  <div className="space-y-1">
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-2 bg-muted rounded w-2/3" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : popularSongs.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {popularSongs.map((song) => (
              <Card 
                key={song.id} 
                className="aspect-square cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                onClick={() => handleSongClick(song.id)}
              >
                <div className="p-3 h-full flex flex-col">
                  <div className="flex-1 relative mb-2">
                    <img
                      src={song.cover_url}
                      alt={`${song.title} cover`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
                      <Play className="h-6 w-6 text-white opacity-0 hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-medium text-sm line-clamp-1">{song.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">{song.artist}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-6 text-center">
            <Music className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No hay canciones populares disponibles</p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Index;
