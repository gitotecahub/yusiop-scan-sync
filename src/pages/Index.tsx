import { Link, useNavigate, useLocation } from 'react-router-dom';
import { QrCode, Music, Play, Sparkles, Send, TrendingUp, Gift, ArrowRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import DigitalCard from '@/components/DigitalCard';
import { useLanguageStore } from '@/stores/languageStore';

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
  const { t, language } = useLanguageStore();

  const [popularSongs, setPopularSongs] = useState<SongCard[]>([]);
  const [recentSongs, setRecentSongs] = useState<SongCard[]>([]);
  const [forYou, setForYou] = useState<SongCard[]>([]);
  const [loading, setLoading] = useState(true);
  const carouselRef = useRef<HTMLDivElement>(null);

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

  // Desplazamiento automático suave de derecha a izquierda cada 15s
  useEffect(() => {
    if (recentSongs.length < 2) return;
    const container = carouselRef.current;
    if (!container) return;
    
    const id = setInterval(() => {
      const scrollAmount = container.clientWidth * 0.8; // Scroll ~80% del ancho visible
      const maxScroll = container.scrollWidth - container.clientWidth;
      
      if (container.scrollLeft >= maxScroll - 10) {
        // Si llegó al final, vuelve al inicio suavemente
        container.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        // Scroll hacia la derecha (muestra elementos de la derecha = izquierda en vista)
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }, 15000);
    return () => clearInterval(id);
  }, [recentSongs.length]);

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
            {t('home.hero.title').split('\\n').map((line, i) => (
              <span key={i}>
                {line}
                {i === 0 && <br />}
              </span>
            ))}
            <span className="vapor-text">{language === 'es' ? 'en alta fidelidad' : language === 'en' ? 'in high fidelity' : language === 'fr' ? 'en haute fidélité' : 'em alta fidelidade'}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-4 max-w-xs leading-relaxed">
            {t('home.hero.subtitle')}
          </p>

          {/* CTAs */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            <Link
              to="/qr"
              className="group relative overflow-hidden rounded-3xl px-4 py-4 flex items-center gap-2.5 vapor-bg shadow-glow hover:shadow-vapor transition-all hover:-translate-y-0.5"
            >
              <QrCode className="h-5 w-5 text-primary-foreground" strokeWidth={2.2} />
              <span className="font-display font-bold text-sm text-primary-foreground">{t('home.hero.scan')}</span>
            </Link>
            <Link
              to="/catalog"
              className="group relative overflow-hidden rounded-3xl px-4 py-4 flex items-center gap-2.5 border border-primary/40 bg-card/40 backdrop-blur-md hover:border-primary/70 hover:bg-card/70 transition-all hover:-translate-y-0.5"
            >
              <Music className="h-5 w-5 text-foreground" strokeWidth={2.2} />
              <span className="font-display font-bold text-sm text-foreground">{t('home.hero.explore')}</span>
            </Link>
          </div>
        </div>
      </section>



      {/* === LANZAMIENTOS DESTACADOS — carrusel horizontal === */}
      <Section title={t('home.section.recent')} link="/catalog">
        {loading ? (
          <HScrollSkeleton variant="card" />
        ) : recentSongs.length > 0 ? (
          <div ref={carouselRef} className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 snap-x snap-mandatory scroll-smooth">
            {recentSongs.map((song, idx) => {
              const isNew = song.created_at && (Date.now() - new Date(song.created_at).getTime()) < 1000 * 60 * 60 * 24 * 30;
              return (
                <button
                  key={song.id}
                  onClick={() => goSong(song.id)}
                  className="snap-start group relative shrink-0 w-32 rounded-2xl overflow-hidden border border-border md:hover:border-primary/50 transition-colors md:transition-all md:hover:-translate-y-1 md:hover:shadow-vapor text-left"
                >
                  <div className="aspect-square relative overflow-hidden">
                    <img
                      src={song.cover_url}
                      alt={song.title}
                      className="absolute inset-0 w-full h-full object-cover md:group-hover:scale-110 md:transition-transform md:duration-700"
                      loading="lazy"
                      draggable={false}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/20 to-transparent pointer-events-none" />
                    {isNew && (
                      <span className="absolute top-1.5 left-1.5 chip chip-vapor !text-[8px] !px-1.5 !py-0.5">
                        <Sparkles className="h-2 w-2" /> {language === 'es' ? 'NUEVO' : language === 'en' ? 'NEW' : language === 'fr' ? 'NOUVEAU' : 'NOVO'}
                      </span>
                    )}
                    <div className="hidden md:flex absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full vapor-bg items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-glow">
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
      <Section title={t('home.section.trending')} eyebrow={language === 'es' ? 'Lo más sonado' : language === 'en' ? 'Most played' : language === 'fr' ? 'Les plus écoutés' : 'Mais tocadas'} link="/catalog">
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
          <EmptyState text={language === 'es' ? 'Aún sin trending' : language === 'en' ? 'No trending yet' : language === 'fr' ? 'Pas encore de tendances' : 'Sem tendências ainda'} />
        )}
      </Section>

      {/* === TARJETAS DESTACADAS — reales === */}
      <Section title={t('home.section.cards')} eyebrow={language === 'es' ? 'Colección' : language === 'en' ? 'Collection' : language === 'fr' ? 'Collection' : 'Coleção'} link="/store">
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
              <p className="font-display font-bold text-xs leading-tight">{t('card.standard')}</p>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-[10px] text-muted-foreground">4 {t('card.downloads')}</p>
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
              <p className="font-display font-bold text-xs leading-tight">{t('card.premium')}</p>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-[10px] text-muted-foreground">10 {t('card.downloads')}</p>
                <span className="font-display font-bold text-xs vapor-text">10,00 €</span>
              </div>
            </div>
          </button>
        </div>
      </Section>

      {/* === ACTIVIDAD EN LA COMUNIDAD === */}
      <Section title={t('home.section.activity')} eyebrow="Live">
        <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 snap-x snap-mandatory">
          <ActivityTile
            icon={<Send className="h-3.5 w-3.5" />}
            title={language === 'es' ? 'Comparte música' : language === 'en' ? 'Share music' : language === 'fr' ? 'Partagez musique' : 'Compartilhar música'}
            subtitle={language === 'es' ? 'Regala canciones a tus amigos' : language === 'en' ? 'Gift songs to friends' : language === 'fr' ? 'Offrez des chansons' : 'Presenteie com músicas'}
            time={language === 'es' ? 'Cualquier momento' : language === 'en' ? 'Anytime' : language === 'fr' ? 'À tout moment' : 'A qualquer momento'}
            onClick={() => navigate('/library')}
          />
          <ActivityTile
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            title={language === 'es' ? 'Top descargada' : language === 'en' ? 'Top downloaded' : language === 'fr' ? 'Plus téléchargée' : 'Mais baixada'}
            subtitle={popularSongs[0]?.title || (language === 'es' ? 'Descubre el ranking' : language === 'en' ? 'Discover the ranking' : language === 'fr' ? 'Découvrez le classement' : 'Descubra o ranking')}
            time={popularSongs[0]?.artist || 'En vivo'}
            onClick={() => navigate('/catalog')}
          />
          <ActivityTile
            icon={<Gift className="h-3.5 w-3.5" />}
            title={language === 'es' ? 'Recibe regalos' : language === 'en' ? 'Receive gifts' : language === 'fr' ? 'Recevez cadeaux' : 'Receba presentes'}
            subtitle={language === 'es' ? 'Canjea códigos de tus amigos' : language === 'en' ? 'Redeem codes from friends' : language === 'fr' ? 'Utilisez codes amis' : 'Resgate códigos dos amigos'}
            time={language === 'es' ? 'Gratis' : language === 'en' ? 'Free' : language === 'fr' ? 'Gratuit' : 'Grátis'}
            onClick={() => navigate('/qr')}
          />
        </div>
      </Section>

      {/* === PARA TI === */}
      <Section title={t('home.section.foryou')} eyebrow={language === 'es' ? 'Recomendado' : language === 'en' ? 'Recommended' : language === 'fr' ? 'Recommandé' : 'Recomendado'} link="/catalog">
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
          <EmptyState text={language === 'es' ? 'Pronto verás recomendaciones' : language === 'en' ? 'Recommendations coming soon' : language === 'fr' ? 'Recommandations bientôt' : 'Recomendações em breve'} />
        )}
      </Section>

      {/* === CTA FINAL === */}
      <section className="relative overflow-hidden rounded-3xl border border-primary/30 p-6 text-center vapor-card">
        <div
          className="absolute inset-0 opacity-50 pointer-events-none"
          style={{ background: 'var(--gradient-vapor)' }}
        />
        <div className="relative">
          <p className="eyebrow mb-2">{t('home.footer.cta')}</p>
          <h3 className="font-display text-2xl font-bold leading-tight mb-4">
            {t('app.tagline').split(' ').slice(0, -1).join(' ')} <span className="vapor-text">{t('app.tagline').split(' ').pop()}</span>
          </h3>
          <Link
            to="/catalog"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-background text-foreground font-display font-bold text-sm hover:bg-foreground hover:text-background transition-colors"
          >
            {t('home.hero.explore')} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <div className="pt-2 flex justify-between items-center">
        <span className="eyebrow">{t('app.copyright')}</span>
        <span className="eyebrow vapor-text">{t('app.madeForSound')}</span>
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
      <div key={i} className="shrink-0 w-32">
        <div className="aspect-square rounded-2xl bg-muted animate-pulse" />
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
