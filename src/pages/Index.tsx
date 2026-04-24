import { Link, useNavigate, useLocation } from 'react-router-dom';
import { QrCode, Music, Play, Sparkles, Send, TrendingUp, Gift, ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import DigitalCard from '@/components/DigitalCard';

interface SongCard {
  id: string;
  title: string;
  artist: string;
  cover_url: string;
  download_count?: number;
  created_at?: string;
}

const FEATURED_GRADIENTS = [
  'linear-gradient(135deg, hsl(250 95% 35%), hsl(280 85% 45%))',
  'linear-gradient(135deg, hsl(232 90% 35%), hsl(188 85% 40%))',
  'linear-gradient(135deg, hsl(280 85% 35%), hsl(320 85% 45%))',
  'linear-gradient(135deg, hsl(188 85% 35%), hsl(160 80% 40%))',
];

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [popularSongs, setPopularSongs] = useState<SongCard[]>([]);
  const [recentSongs, setRecentSongs] = useState<SongCard[]>([]);
  const [forYou, setForYou] = useState<SongCard[]>([]);
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [popularRes, recentRes] = await Promise.all([
          supabase
            .from('user_downloads')
            .select(`song_id, songs!inner(id, title, cover_url, artists!inner(name), albums(cover_url))`)
            .limit(150),
          supabase
            .from('songs')
            .select(`id, title, cover_url, created_at, artists!inner(name), albums(cover_url)`)
            .order('created_at', { ascending: false })
            .limit(20),
        ]);

        // Popular agregado
        const counts: Record<string, { song: any; count: number }> = {};
        popularRes.data?.forEach((d: any) => {
          if (!counts[d.song_id]) counts[d.song_id] = { song: d.songs, count: 0 };
          counts[d.song_id].count++;
        });
        const popular = Object.values(counts)
          .sort((a, b) => b.count - a.count)
          .slice(0, 8)
          .map((it) => ({
            id: it.song.id,
            title: it.song.title,
            artist: it.song.artists.name,
            cover_url: it.song.cover_url || it.song.albums?.cover_url || `https://picsum.photos/300/300?random=${it.song.id}`,
            download_count: it.count,
          }));
        setPopularSongs(popular);

        // Recientes
        const recents: SongCard[] = (recentRes.data || []).map((s: any) => ({
          id: s.id,
          title: s.title,
          artist: s.artists.name,
          cover_url: s.cover_url || s.albums?.cover_url || `https://picsum.photos/400/400?random=${s.id}`,
          created_at: s.created_at,
        }));
        setRecentSongs(recents.slice(0, 8));

        // "Para ti" — mezcla aleatoria del catálogo
        const shuffled = [...recents].sort(() => 0.5 - Math.random());
        setForYou(shuffled.slice(0, 6));
      } catch (e) {
        console.error('Home fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const goSong = (id: string) => navigate('/catalog', { state: { highlightSongId: id } });

  return (
    <div className="space-y-10 pb-4">
      {/* === HERO === */}
      <section className="relative -mx-5 px-5 pt-2 pb-6 overflow-hidden">
        <div
          className="absolute inset-0 opacity-60 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 80% 20%, hsl(250 95% 50% / 0.35), transparent 65%), radial-gradient(ellipse 60% 50% at 10% 80%, hsl(188 85% 45% / 0.25), transparent 60%)',
          }}
        />
        <div className="relative">
          <h1 className="display-xl text-[2.6rem] sm:text-5xl">
            Tu música,<br />
            <span className="vapor-text">en alta fidelidad</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-4 max-w-xs leading-relaxed">
            Escanea, descubre y colecciona. Una experiencia sonora pensada para ti.
          </p>

          {/* CTAs */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            <Link
              to="/qr"
              className="group relative overflow-hidden rounded-3xl px-4 py-4 flex items-center gap-2.5 vapor-bg shadow-glow hover:shadow-vapor transition-all hover:-translate-y-0.5"
            >
              <QrCode className="h-5 w-5 text-primary-foreground" strokeWidth={2.2} />
              <span className="font-display font-bold text-sm text-primary-foreground">Escanear tarjeta</span>
            </Link>
            <Link
              to="/catalog"
              className="group relative overflow-hidden rounded-3xl px-4 py-4 flex items-center gap-2.5 border border-primary/40 bg-card/40 backdrop-blur-md hover:border-primary/70 hover:bg-card/70 transition-all hover:-translate-y-0.5"
            >
              <Music className="h-5 w-5 text-foreground" strokeWidth={2.2} />
              <span className="font-display font-bold text-sm text-foreground">Explorar música</span>
            </Link>
          </div>
        </div>
      </section>



      {/* === LANZAMIENTOS DESTACADOS — carrusel horizontal === */}
      <Section title="Lanzamientos destacados" link="/catalog">
        {loading ? (
          <HScrollSkeleton variant="card" />
        ) : recentSongs.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 snap-x snap-mandatory">
            {recentSongs.map((song, idx) => {
              const isNew = song.created_at && (Date.now() - new Date(song.created_at).getTime()) < 1000 * 60 * 60 * 24 * 30;
              return (
                <button
                  key={song.id}
                  onClick={() => goSong(song.id)}
                  className="snap-start group relative shrink-0 w-32 rounded-2xl overflow-hidden border border-border hover:border-primary/50 transition-all hover:-translate-y-1 hover:shadow-vapor text-left"
                >
                  <div className="aspect-square relative overflow-hidden">
                    <img
                      src={song.cover_url}
                      alt={song.title}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/20 to-transparent" />
                    {isNew && (
                      <span className="absolute top-1.5 left-1.5 chip chip-vapor !text-[8px] !px-1.5 !py-0.5">
                        <Sparkles className="h-2 w-2" /> NUEVO
                      </span>
                    )}
                    <div className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full vapor-bg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-glow">
                      <Play className="h-3 w-3 text-primary-foreground ml-0.5" />
                    </div>
                  </div>
                  <div className="p-2">
                    <h3 className="font-display font-bold text-xs leading-tight line-clamp-1">{song.title}</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{song.artist}</p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <EmptyState text="Pronto habrá lanzamientos" />
        )}
      </Section>

      {/* === TRENDING — lista numerada en grid 2 cols === */}
      <Section title="Trending" eyebrow="Lo más sonado" link="/catalog">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : popularSongs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {popularSongs.slice(0, 6).map((song, idx) => (
              <button
                key={song.id}
                onClick={() => goSong(song.id)}
                className="group flex items-center gap-3 p-2 rounded-2xl border border-border bg-card/40 hover:bg-card hover:border-primary/40 transition-all text-left"
              >
                <span className="w-6 text-center font-display font-bold text-lg vapor-text shrink-0">{idx + 1}</span>
                <img
                  src={song.cover_url}
                  alt={song.title}
                  className="w-11 h-11 rounded-xl object-cover shrink-0"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-sm line-clamp-1">{song.title}</h3>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">{song.artist}</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-background/80 border border-border group-hover:vapor-bg group-hover:border-transparent flex items-center justify-center transition-all shrink-0">
                  <Play className="h-3.5 w-3.5 text-foreground group-hover:text-primary-foreground ml-0.5" />
                </div>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState text="Aún sin trending" />
        )}
      </Section>

      {/* === TARJETAS DESTACADAS — reales === */}
      <Section title="Tarjetas destacadas" eyebrow="Colección" link="/store">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/store')}
            className="group text-left transition-all hover:-translate-y-1"
            aria-label="Ver tarjeta Estándar en la tienda"
          >
            <DigitalCard
              code="YUSIOP-DEMO-A7K9X2"
              cardType="standard"
              downloadCredits={4}
              compact
            />
            <div className="mt-2 px-0.5">
              <p className="font-display font-bold text-xs leading-tight">Estándar</p>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-[10px] text-muted-foreground">4 descargas</p>
                <span className="font-display font-bold text-xs vapor-text">5,00 €</span>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/store')}
            className="group text-left transition-all hover:-translate-y-1"
            aria-label="Ver tarjeta Premium en la tienda"
          >
            <DigitalCard
              code="YUSIOP-DEMO-B3R7D9"
              cardType="premium"
              downloadCredits={10}
              compact
            />
            <div className="mt-2 px-0.5">
              <p className="font-display font-bold text-xs leading-tight">Premium</p>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-[10px] text-muted-foreground">10 descargas</p>
                <span className="font-display font-bold text-xs vapor-text">10,00 €</span>
              </div>
            </div>
          </button>
        </div>
      </Section>

      {/* === ACTIVIDAD EN LA COMUNIDAD === */}
      <Section title="Actividad en la comunidad" eyebrow="Live">
        <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 snap-x snap-mandatory">
          <ActivityTile
            icon={<Send className="h-3.5 w-3.5" />}
            title="Comparte música"
            subtitle="Regala canciones a tus amigos"
            time="Cualquier momento"
            onClick={() => navigate('/library')}
          />
          <ActivityTile
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            title="Top descargada"
            subtitle={popularSongs[0]?.title || 'Descubre el ranking'}
            time={popularSongs[0]?.artist || 'En vivo'}
            onClick={() => navigate('/catalog')}
          />
          <ActivityTile
            icon={<Gift className="h-3.5 w-3.5" />}
            title="Recibe regalos"
            subtitle="Canjea códigos de tus amigos"
            time="Gratis"
            onClick={() => navigate('/qr')}
          />
        </div>
      </Section>

      {/* === PARA TI === */}
      <Section title="Para ti" eyebrow="Recomendado" link="/catalog">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-[4/3] rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : forYou.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {forYou.slice(0, 4).map((song, idx) => (
              <button
                key={song.id}
                onClick={() => goSong(song.id)}
                className="group relative aspect-[4/3] rounded-2xl overflow-hidden border border-border hover:border-primary/50 hover:shadow-vapor transition-all text-left"
              >
                <div
                  className="absolute inset-0"
                  style={{ background: FEATURED_GRADIENTS[idx % FEATURED_GRADIENTS.length] }}
                />
                <img
                  src={song.cover_url}
                  alt={song.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-90 group-hover:scale-110 transition-all duration-700 mix-blend-luminosity"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent" />
                <div className="absolute bottom-2.5 left-2.5 right-2.5">
                  <h3 className="font-display font-bold text-sm leading-tight line-clamp-1">{song.title}</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{song.artist}</p>
                </div>
                <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full vapor-bg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-glow">
                  <Play className="h-3 w-3 text-primary-foreground ml-0.5" />
                </div>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState text="Pronto verás recomendaciones" />
        )}
      </Section>

      {/* === CTA FINAL === */}
      <section className="relative overflow-hidden rounded-3xl border border-primary/30 p-6 text-center vapor-card">
        <div
          className="absolute inset-0 opacity-50 pointer-events-none"
          style={{ background: 'var(--gradient-vapor)' }}
        />
        <div className="relative">
          <p className="eyebrow mb-2">Tu sonido te espera</p>
          <h3 className="font-display text-2xl font-bold leading-tight mb-4">
            Cada canción cuenta una <span className="vapor-text">historia</span>
          </h3>
          <Link
            to="/catalog"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-background text-foreground font-display font-bold text-sm hover:bg-foreground hover:text-background transition-colors"
          >
            Explorar catálogo <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <div className="pt-2 flex justify-between items-center">
        <span className="eyebrow">© Yusiop 2026</span>
        <span className="eyebrow vapor-text">Made for sound</span>
      </div>
    </div>
  );
};

/* ===== Subcomponentes inline (file-local) ===== */

const Section = ({
  title,
  eyebrow,
  link,
  children,
}: {
  title: string;
  eyebrow?: string;
  link?: string;
  children: React.ReactNode;
}) => (
  <section>
    <div className="flex items-end justify-between mb-3">
      <div>
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h2 className="font-display text-xl font-bold tracking-tight">{title}</h2>
      </div>
      {link && (
        <Link to={link} className="text-xs text-primary hover:underline underline-offset-4 font-semibold">
          Ver todo →
        </Link>
      )}
    </div>
    {children}
  </section>
);

const HScrollSkeleton = ({ variant }: { variant: 'card' }) => (
  <div className="flex gap-3 overflow-hidden -mx-5 px-5">
    {[1, 2, 3].map((i) => (
      <div key={i} className="shrink-0 w-44">
        <div className="aspect-square rounded-3xl bg-muted animate-pulse" />
      </div>
    ))}
  </div>
);

const EmptyState = ({ text }: { text: string }) => (
  <div className="vapor-card p-8 text-center">
    <Music className="h-8 w-8 text-muted-foreground mx-auto mb-2" strokeWidth={1.4} />
    <p className="text-muted-foreground text-sm">{text}</p>
  </div>
);

const CardTile = ({
  label,
  sub,
  price,
  gradient,
  onClick,
}: {
  label: string;
  sub: string;
  price: string;
  gradient: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="group relative overflow-hidden rounded-3xl border border-border hover:border-primary/50 transition-all hover:-translate-y-1 hover:shadow-vapor text-left aspect-[1/1.15]"
  >
    <div className="absolute inset-0" style={{ background: gradient }} />
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/40" />
    <div className="relative h-full p-4 flex flex-col justify-between">
      <div>
        <h3 className="font-display font-bold text-base text-white drop-shadow-md">{label}</h3>
        <p className="text-[11px] text-white/80 mt-0.5">{sub}</p>
      </div>
      <div className="self-end">
        <div className="w-12 h-12 rounded-xl bg-white/95 flex items-center justify-center shadow-lg">
          <QrCode className="h-7 w-7 text-foreground" strokeWidth={1.6} />
        </div>
      </div>
      <div className="absolute bottom-3 left-4">
        <span className="font-display font-bold text-sm text-white drop-shadow">{price}</span>
      </div>
    </div>
  </button>
);

const ActivityTile = ({
  icon,
  title,
  subtitle,
  time,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  time: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="snap-start shrink-0 w-56 p-3.5 rounded-2xl border border-border bg-card/50 hover:bg-card hover:border-primary/40 transition-all text-left"
  >
    <div className="flex items-center justify-between mb-2.5">
      <div className="w-7 h-7 rounded-lg vapor-bg flex items-center justify-center text-primary-foreground">
        {icon}
      </div>
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{time}</span>
    </div>
    <h3 className="font-display font-bold text-sm line-clamp-1">{title}</h3>
    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{subtitle}</p>
  </button>
);

export default Index;
