import { Link, useNavigate } from 'react-router-dom';
import { QrCode, Music, Library, User, Play, Settings } from 'lucide-react';
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
    { title: 'Escanear QR', description: 'Activa tu tarjeta', icon: QrCode, link: '/qr', number: '01' },
    { title: 'Catálogo', description: 'Explora música', icon: Music, link: '/catalog', number: '02' },
    { title: 'Mi Biblioteca', description: 'Tus descargas', icon: Library, link: '/library', number: '03' },
    { title: 'Perfil', description: 'Tu cuenta', icon: User, link: '/profile', number: '04' }
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
    <div className="space-y-10">
      {/* Hero — editorial cover */}
      <section className="pt-4 pb-2">
        <div className="flex items-center gap-3 mb-6">
          <span className="editorial-rule" />
          <p className="eyebrow">Issue 01 · Sound</p>
        </div>
        <h1 className="display-xl text-6xl">
          Sintoniza<br />
          <span className="gold-text">tu mundo.</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-5 max-w-xs leading-relaxed">
          Una experiencia editorial para escanear, descubrir y coleccionar música. Limpia. Pausada. Tuya.
        </p>
      </section>

      {/* Navigation index — magazine TOC */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <p className="eyebrow">Índice</p>
          <p className="eyebrow">04 secciones</p>
        </div>
        <div className="border-t border-border">
          {navCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.link}
                to={card.link}
                className="group flex items-center gap-4 py-5 border-b border-border transition-colors hover:bg-muted/30"
              >
                <span className="font-display text-xs font-medium text-muted-foreground tabular-nums w-6">{card.number}</span>
                <Icon className="h-4 w-4 text-primary shrink-0" strokeWidth={1.6} />
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-base leading-tight">{card.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{card.description}</p>
                </div>
                <span className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all">→</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Admin Panel Access */}
      {isAdmin && (
        <Link to="/admin" className="block">
          <div className="flex items-center gap-4 p-5 border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors">
            <div className="w-10 h-10 bg-primary flex items-center justify-center">
              <Settings className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <p className="eyebrow text-primary mb-1">Restringido</p>
              <h3 className="font-display font-bold text-sm">Panel de Administración</h3>
            </div>
            <span className="text-primary">→</span>
          </div>
        </Link>
      )}

      {/* Featured — music popular */}
      <section>
        <div className="flex items-end justify-between mb-5">
          <div>
            <p className="eyebrow mb-2">Destacado</p>
            <h2 className="font-display text-3xl font-bold tracking-tight">Música Popular</h2>
          </div>
          <Link to="/catalog" className="text-xs text-primary hover:underline underline-offset-4">
            Ver todo →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-muted aspect-square animate-pulse" />
            ))}
          </div>
        ) : popularSongs.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {popularSongs.map((song, idx) => (
              <button
                key={song.id}
                onClick={() => handleSongClick(song.id)}
                className="group relative overflow-hidden aspect-square text-left"
              >
                <img
                  src={song.cover_url}
                  alt={`${song.title} cover`}
                  className="absolute inset-0 w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                <div className="absolute top-2 left-2 font-display text-[10px] font-bold text-primary tabular-nums tracking-widest">
                  N°{String(idx + 1).padStart(2, '0')}
                </div>
                <div className="absolute top-2 right-2 w-9 h-9 bg-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="h-4 w-4 text-primary-foreground ml-0.5" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h3 className="font-display font-bold text-sm text-white line-clamp-1 leading-tight">{song.title}</h3>
                  <p className="text-[11px] text-white/70 line-clamp-1 mt-0.5">{song.artist}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="border border-border p-10 text-center">
            <Music className="h-10 w-10 text-muted-foreground mx-auto mb-3" strokeWidth={1.2} />
            <p className="text-muted-foreground text-sm">No hay canciones populares disponibles</p>
          </div>
        )}
      </section>

      <div className="pt-4 pb-2 border-t border-border flex justify-between items-center">
        <span className="eyebrow">© Yusiop MMXXVI</span>
        <span className="eyebrow">Edición digital</span>
      </div>
    </div>
  );
};

export default Index;
