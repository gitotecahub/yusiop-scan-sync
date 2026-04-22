import { Link, useNavigate, useLocation } from 'react-router-dom';
import { QrCode, Music, Library, User, Play, Settings, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const location = useLocation();
  const [popularSongs, setPopularSongs] = useState<PopularSong[]>([]);
  const [loading, setLoading] = useState(true);

  // Mensaje de felicitación tras volver de Stripe Checkout
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('status') === 'success') {
      toast.success('🎉 ¡Felicidades por tu compra! Tu tarjeta estará disponible en unos segundos.', {
        duration: 2500,
      });
      navigate('/', { replace: true });
    }
  }, [location.search, navigate]);

  const navCards = [
    { title: 'Escanear QR', description: 'Activa tu tarjeta', icon: QrCode, link: '/qr', variant: '' },
    { title: 'Catálogo', description: 'Explora música', icon: Music, link: '/catalog', variant: 'blob-card-aurora' },
    { title: 'Mi Biblioteca', description: 'Tus descargas', icon: Library, link: '/library', variant: 'blob-card-sunset' },
    { title: 'Perfil', description: 'Tu cuenta', icon: User, link: '/profile', variant: '' }
  ];

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
          .limit(100);

        if (error) {
          console.error('Error fetching popular songs:', error);
          return;
        }

        const downloadCounts: { [key: string]: { song: any; count: number } } = {};
        popularData?.forEach((download) => {
          const songId = download.song_id;
          if (!downloadCounts[songId]) {
            downloadCounts[songId] = { song: download.songs, count: 0 };
          }
          downloadCounts[songId].count++;
        });

        const songsArray = Object.values(downloadCounts)
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
          .map(item => ({
            id: item.song.id,
            title: item.song.title,
            artist: item.song.artists.name,
            cover_url: item.song.cover_url || item.song.albums?.cover_url || 'https://picsum.photos/300/300?random=1',
            download_count: item.count
          }));

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
    <div className="space-y-8">
      {/* Hero */}
      <section className="pt-4 pb-2">
        <h1 className="display-xl text-5xl">
          Tu música,<br />
          <span className="vapor-text">en alta fidelidad</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-4 max-w-xs leading-relaxed">
          Escanea, descubre y colecciona. Una experiencia sonora pensada para tu generación.
        </p>
      </section>

      {/* Quick nav — blob cards */}
      <section>
        <div className="grid grid-cols-2 gap-3">
          {navCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.link}
                to={card.link}
                className={`blob-card ${card.variant} group p-5 aspect-[1/1.05] flex flex-col justify-between`}
              >
                <div className="w-11 h-11 rounded-2xl bg-background/40 backdrop-blur-md border border-border/60 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Icon className="h-5 w-5 text-foreground" strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base leading-tight text-foreground">{card.title}</h3>
                  <p className="text-[11px] text-foreground/70 mt-1">{card.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Admin Panel Access */}
      {isAdmin && (
        <Link to="/admin" className="block">
          <div className="vapor-card p-5 flex items-center gap-4 hover:shadow-vapor">
            <div className="w-11 h-11 rounded-2xl vapor-bg flex items-center justify-center shadow-glow">
              <Settings className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <p className="eyebrow vapor-text mb-1">Restringido</p>
              <h3 className="font-display font-bold text-sm">Panel de Administración</h3>
            </div>
            <span className="text-primary text-lg">→</span>
          </div>
        </Link>
      )}

      {/* Featured */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="eyebrow mb-1.5">Trending</p>
            <h2 className="font-display text-2xl font-bold tracking-tight">Música popular</h2>
          </div>
          <Link to="/catalog" className="text-xs text-primary hover:underline underline-offset-4 font-semibold">
            Ver todo →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-muted aspect-square rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : popularSongs.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {popularSongs.map((song, idx) => (
              <button
                key={song.id}
                onClick={() => handleSongClick(song.id)}
                className="group relative overflow-hidden aspect-square text-left rounded-3xl border border-border hover:shadow-vapor hover:-translate-y-1 transition-all duration-500"
              >
                <img
                  src={song.cover_url}
                  alt={`${song.title} cover`}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                <div className="absolute top-3 right-3 w-9 h-9 rounded-full vapor-bg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-glow">
                  <Play className="h-4 w-4 text-primary-foreground ml-0.5" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h3 className="font-display font-bold text-sm text-foreground line-clamp-1 leading-tight">{song.title}</h3>
                  <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{song.artist}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="vapor-card p-10 text-center">
            <Music className="h-10 w-10 text-muted-foreground mx-auto mb-3" strokeWidth={1.4} />
            <p className="text-muted-foreground text-sm">No hay canciones populares aún</p>
          </div>
        )}
      </section>

      <div className="pt-4 pb-2 flex justify-between items-center">
        <span className="eyebrow">© Yusiop 2026</span>
        <span className="eyebrow vapor-text">Made for sound</span>
      </div>
    </div>
  );
};

export default Index;
