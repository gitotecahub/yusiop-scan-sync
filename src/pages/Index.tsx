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
      gradient: 'from-violet-400/30 to-indigo-400/30'
    },
    {
      title: 'Catálogo',
      description: 'Explora música',
      icon: Music,
      link: '/catalog',
      gradient: 'from-cyan-300/30 to-sky-400/30'
    },
    {
      title: 'Mi Biblioteca',
      description: 'Tus descargas',
      icon: Library,
      link: '/library',
      gradient: 'from-fuchsia-300/30 to-violet-400/30'
    },
    {
      title: 'Perfil',
      description: 'Tu cuenta',
      icon: User,
      link: '/profile',
      gradient: 'from-cyan-200/30 to-emerald-300/30'
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
    <div className="space-y-7">
      {/* Hero */}
      <section className="relative pt-2 pb-4">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">Bienvenido</p>
        <h1 className="font-display text-4xl font-bold leading-tight">
          <span className="vapor-text">Sintoniza</span><br />
          <span className="text-foreground">tu mundo</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-3 max-w-xs">
          Escanea, descubre y descarga tu música favorita en una experiencia limpia y rápida.
        </p>
      </section>

      {/* Navigation Cards */}
      <div className="grid grid-cols-2 gap-3">
        {navCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.link} to={card.link} className="group">
              <div className={`relative overflow-hidden glass rounded-3xl p-4 h-32 flex flex-col justify-between transition-all duration-300 hover:scale-[1.03] hover:shadow-glow`}>
                <div className={`absolute -top-8 -right-8 w-28 h-28 rounded-full bg-gradient-to-br ${card.gradient} blur-2xl opacity-80`} />
                <div className="relative w-10 h-10 rounded-2xl glass flex items-center justify-center">
                  <Icon className="h-5 w-5 text-foreground" />
                </div>
                <div className="relative">
                  <h3 className="font-display font-semibold text-sm">{card.title}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{card.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Admin Panel Access */}
      {isAdmin && (
        <Link to="/admin">
          <div className="relative overflow-hidden glass rounded-3xl p-4 flex items-center gap-4 hover:scale-[1.01] transition-all">
            <div className="absolute inset-0 bg-gradient-to-r from-rose-400/15 to-orange-400/15" />
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-400 to-orange-400 flex items-center justify-center shadow-lg">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <div className="relative">
              <h3 className="font-display font-semibold">Panel de Administración</h3>
              <p className="text-xs text-muted-foreground">Gestiona usuarios, música y configuraciones</p>
            </div>
          </div>
        </Link>
      )}

      {/* Music Preview Section */}
      <div>
        <div className="flex items-end justify-between mb-3">
          <h2 className="font-display text-xl font-bold">Música Popular</h2>
          <Link to="/catalog" className="text-xs text-primary hover:underline">Ver todo →</Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass rounded-3xl aspect-square animate-pulse" />
            ))}
          </div>
        ) : popularSongs.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {popularSongs.map((song) => (
              <button
                key={song.id}
                onClick={() => handleSongClick(song.id)}
                className="group relative overflow-hidden rounded-3xl aspect-square text-left transition-all duration-300 hover:scale-[1.03] hover:shadow-glow"
              >
                <img
                  src={song.cover_url}
                  alt={`${song.title} cover`}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute top-2 right-2 w-9 h-9 rounded-full vapor-gradient flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-glow">
                  <Play className="h-4 w-4 text-primary-foreground ml-0.5" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h3 className="font-semibold text-sm text-white line-clamp-1">{song.title}</h3>
                  <p className="text-xs text-white/70 line-clamp-1">{song.artist}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="glass rounded-3xl p-8 text-center">
            <Music className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No hay canciones populares disponibles</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
