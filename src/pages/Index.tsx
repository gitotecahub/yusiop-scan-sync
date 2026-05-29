import { Link, useNavigate, useLocation } from 'react-router-dom';
import { QrCode, Music, Play, Sparkles, ArrowRight, Music2, Flame } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import DigitalCard from '@/components/DigitalCard';
import SubscriptionBanner from '@/components/SubscriptionBanner';
import PopularSection from '@/components/PopularSection';
import SongCarousel, { CarouselSong } from '@/components/SongCarousel';
import AdBanner from '@/components/ads/AdBanner';
import { useLanguageStore } from '@/stores/languageStore';
import { useRecommendations } from '@/hooks/useRecommendations';
import { useAuthStore } from '@/stores/authStore';
import { useLocaleStore } from '@/stores/localeStore';

interface SongRow {
  id: string;
  title: string;
  artist: string;
  cover_url: string;
  created_at?: string;
  download_count?: number;
}

const HERO_GRADIENTS = [
  'linear-gradient(135deg, hsl(250 95% 35%), hsl(280 85% 45%))',
  'linear-gradient(135deg, hsl(232 90% 35%), hsl(188 85% 40%))',
  'linear-gradient(135deg, hsl(280 85% 35%), hsl(320 85% 45%))',
  'linear-gradient(135deg, hsl(188 85% 35%), hsl(160 80% 40%))',
];

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language } = useLanguageStore();

  const [trendingSongs, setTrendingSongs] = useState<CarouselSong[]>([]);
  const [recentSongs, setRecentSongs] = useState<CarouselSong[]>([]);
  const [heroSlides, setHeroSlides] = useState<SongRow[]>([]);
  const [loading, setLoading] = useState(true);
  const heroRef = useRef<HTMLDivElement>(null);

  // Mensaje tras Stripe Checkout
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
            .select(`song_id, songs!inner(id, title, cover_url, album_id, artists!inner(name), albums(title, cover_url))`)
            .limit(150),
          supabase
            .from('songs')
            .select(`id, title, cover_url, created_at, album_id, artists!inner(name), albums(title, cover_url)`)
            .order('created_at', { ascending: false })
            .limit(40),
        ]);

        // Trending agregado por descargas (agrupado por álbum cuando aplica)
        const counts: Record<string, { song: any; count: number }> = {};
        popularRes.data?.forEach((d: any) => {
          const s = d.songs;
          const key = s.album_id ? `album:${s.album_id}` : s.id;
          if (!counts[key]) counts[key] = { song: s, count: 0 };
          counts[key].count++;
        });
        const trending: CarouselSong[] = Object.values(counts)
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
          .map((it, idx) => {
            const s = it.song;
            const isAlbum = !!s.album_id;
            return {
              id: isAlbum ? `album:${s.album_id}` : s.id,
              title: isAlbum ? (s.albums?.title || s.title) : s.title,
              artist: s.artists.name,
              cover_url:
                (isAlbum ? s.albums?.cover_url : s.cover_url) ||
                s.albums?.cover_url ||
                s.cover_url ||
                `https://picsum.photos/300/300?random=${s.id}`,
              rank: idx + 1,
              badge: isAlbum ? (
                <span className="chip chip-vapor !text-[8px] !px-1.5 !py-0.5">ÁLBUM</span>
              ) : undefined,
            };
          });
        setTrendingSongs(trending);

        // Recientes — dedupe por álbum
        const seenAlbums = new Set<string>();
        const recentsRaw: (SongRow & { isAlbum?: boolean })[] = [];
        (recentRes.data || []).forEach((s: any) => {
          if (s.album_id) {
            if (seenAlbums.has(s.album_id)) return;
            seenAlbums.add(s.album_id);
            recentsRaw.push({
              id: `album:${s.album_id}`,
              title: s.albums?.title || s.title,
              artist: s.artists.name,
              cover_url:
                s.albums?.cover_url ||
                s.cover_url ||
                `https://picsum.photos/400/400?random=${s.album_id}`,
              created_at: s.created_at,
              isAlbum: true,
            });
          } else {
            recentsRaw.push({
              id: s.id,
              title: s.title,
              artist: s.artists.name,
              cover_url:
                s.cover_url ||
                `https://picsum.photos/400/400?random=${s.id}`,
              created_at: s.created_at,
            });
          }
        });

        const recentBadge = (item: SongRow & { isAlbum?: boolean }) => {
          if (item.isAlbum) {
            return (
              <span className="chip chip-vapor !text-[8px] !px-1.5 !py-0.5">ÁLBUM</span>
            );
          }
          if (!item.created_at) return undefined;
          const isNew = Date.now() - new Date(item.created_at).getTime() < 1000 * 60 * 60 * 24 * 30;
          if (!isNew) return undefined;
          return (
            <span className="chip chip-vapor !text-[8px] !px-1.5 !py-0.5">
              <Sparkles className="h-2 w-2" />{' '}
              {language === 'es' ? 'NUEVO' : language === 'en' ? 'NEW' : language === 'fr' ? 'NOUVEAU' : 'NOVO'}
            </span>
          );
        };

        setRecentSongs(
          recentsRaw.slice(0, 12).map((s) => ({
            id: s.id,
            title: s.title,
            artist: s.artist,
            cover_url: s.cover_url,
            badge: recentBadge(s),
          }))
        );

        // Hero: top 5 lanzamientos más recientes (incluye álbumes)
        setHeroSlides(recentsRaw.slice(0, 5));
      } catch (e) {
        console.error('Home fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [language]);

  // Auto-scroll hero cada 6s
  useEffect(() => {
    if (heroSlides.length < 2) return;
    const container = heroRef.current;
    if (!container) return;
    const id = setInterval(() => {
      const max = container.scrollWidth - container.clientWidth;
      if (container.scrollLeft >= max - 10) {
        container.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: container.clientWidth, behavior: 'smooth' });
      }
    }, 6000);
    return () => clearInterval(id);
  }, [heroSlides.length]);

  const goSong = (id: string) => {
    if (id.startsWith('album:')) {
      const albumId = id.slice('album:'.length);
      navigate('/catalog', { state: { highlightAlbumId: albumId } });
    } else {
      navigate('/catalog', { state: { highlightSongId: id } });
    }
  };

  return (
    <div className="space-y-8 pb-4">
      {/* === HERO INTRO === */}
      <section className="relative -mx-5 px-5 pt-2 pb-2 overflow-hidden">
        <div
          className="absolute inset-0 opacity-60 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 80% 20%, hsl(250 95% 50% / 0.35), transparent 65%), radial-gradient(ellipse 60% 50% at 10% 80%, hsl(188 85% 45% / 0.25), transparent 60%)',
          }}
        />
        <div className="relative">
          <h1 className="display-xl text-[2.2rem] sm:text-4xl text-center">
            <span className="vapor-text">Scan - Sync - Play</span>
          </h1>

          <div className="grid grid-cols-2 gap-3 mt-5">
            <Link
              to="/qr"
              className="group relative overflow-hidden rounded-3xl px-4 py-4 flex items-center gap-2.5 vapor-bg shadow-glow hover:shadow-vapor transition-all hover:-translate-y-0.5"
            >
              <QrCode className="h-5 w-5 text-primary-foreground" strokeWidth={2.2} />
              <span className="font-display font-bold text-sm text-primary-foreground">
                {t('home.hero.scan')}
              </span>
            </Link>
            <Link
              to="/catalog"
              className="group relative overflow-hidden rounded-3xl px-4 py-4 flex items-center gap-2.5 border border-[hsl(var(--primary)/0.55)] bg-card/40 backdrop-blur-md hover:border-[hsl(var(--primary)/0.85)] hover:bg-card/70 hover:shadow-glow transition-all hover:-translate-y-0.5"
            >
              <Music className="h-5 w-5 vapor-text" strokeWidth={2.2} />
              <span className="font-display font-bold text-sm text-foreground">
                {t('home.hero.explore')}
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* === BANNER PUBLICITARIO === */}
      <AdBanner />

      {/* === HERO DESTACADO — carrusel grande === */}
      <section className="space-y-3">
        {loading ? (
          <div className="flex gap-3 -mx-5 px-5">
            <div className="shrink-0 w-full h-[150px] rounded-3xl bg-muted animate-pulse" />
          </div>
        ) : heroSlides.length > 0 ? (
          <>
            <div
              ref={heroRef}
              className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 snap-x snap-mandatory scroll-smooth"
            >
              {heroSlides.map((slide) => (
                <button
                  key={slide.id}
                  onClick={() => goSong(slide.id)}
                  className="snap-start group relative shrink-0 w-[92%] sm:w-[440px] rounded-3xl overflow-hidden border border-border md:hover:border-[hsl(var(--primary)/0.5)] transition-all text-left animate-fade-in"
                >
                  {/* Blurred cover backdrop */}
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-40"
                    style={{ backgroundImage: `url(${slide.cover_url})`, filter: 'blur(18px) saturate(1.2)' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/60 to-background/85" />

                  <div className="relative flex items-center gap-3 p-3">
                    {/* Thumbnail */}
                    <img
                      src={slide.cover_url}
                      alt={slide.title}
                      className="shrink-0 w-[88px] h-[88px] rounded-2xl object-cover shadow-glow border border-[hsl(var(--primary)/0.4)]"
                      loading="lazy"
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Music2 className="h-3 w-3 vapor-text" strokeWidth={2.4} />
                        <p className="eyebrow eyebrow-warm !text-[9px] !tracking-[0.18em]">
                          {language === 'es' ? 'Lanzamiento' : language === 'en' ? 'Release' : language === 'fr' ? 'Sortie' : 'Lançamento'}
                        </p>
                      </div>
                      <p className="eyebrow eyebrow-warm !text-[10px] mb-1.5">
                        {language === 'es' ? 'Destacado' : language === 'en' ? 'Featured' : language === 'fr' ? 'À la une' : 'Destaque'}
                      </p>
                      <h3 className="font-display font-bold text-[17px] leading-tight text-foreground line-clamp-1">
                        {slide.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{slide.artist}</p>

                      <div className="mt-2.5">
                        <span className="inline-flex items-center gap-1.5 pl-3.5 pr-2.5 h-8 rounded-full vapor-bg shadow-vapor group-hover:shadow-glow group-hover:scale-[1.03] transition-all">
                          <span className="font-display font-bold text-[11px] text-white whitespace-nowrap">
                            {language === 'es' ? 'Escuchar ahora' : language === 'en' ? 'Play now' : language === 'fr' ? 'Écouter' : 'Ouvir agora'}
                          </span>
                          <ArrowRight className="h-3.5 w-3.5 text-white" strokeWidth={2.6} />
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {heroSlides.length > 1 && (
              <div className="flex items-center justify-center gap-1.5">
                {heroSlides.map((s, i) => (
                  <span
                    key={s.id}
                    className={`h-1.5 rounded-full transition-all ${
                      i === 0 ? 'w-6 vapor-bg' : 'w-1.5 bg-muted'
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        ) : null}
      </section>

      {/* === DESTACADO — Nuevos lanzamientos === */}
      <SongCarousel
        title={language === 'es' ? 'No te lo pierdas' : language === 'en' ? "Don't miss out" : language === 'fr' ? 'À ne pas manquer' : 'Não perca'}
        eyebrow={
          <span className="eyebrow eyebrow-warm inline-flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" /> {language === 'es' ? 'Destacado' : language === 'en' ? 'Featured' : language === 'fr' ? 'À la une' : 'Destaque'}
          </span>
        }
        seeAllHref="/catalog"
        seeAllLabel={language === 'es' ? 'Ver todo' : language === 'en' ? 'See all' : language === 'fr' ? 'Voir tout' : 'Ver tudo'}
        songs={recentSongs}
        loading={loading}
        onSongClick={goSong}
        emptyText={language === 'es' ? 'Pronto habrá lanzamientos' : 'Coming soon'}
        fireTopCount={recentSongs.length}
      />



      {/* === MINI JUEGO: ADIVINA LA CANCIÓN === */}
      <button
        onClick={() => navigate('/games/guess-song')}
        className="w-full p-4 rounded-2xl glass-strong flex items-center gap-3 hover:scale-[1.01] active:scale-[0.99] transition-transform text-left relative overflow-hidden group"
      >
        <div className="absolute inset-0 vapor-bg opacity-[0.08] group-hover:opacity-[0.14] transition-opacity" />
        <div className="relative w-12 h-12 rounded-xl vapor-bg flex items-center justify-center shadow-glow">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <div className="relative flex-1 min-w-0">
          <div className="font-bold">Adivina la canción</div>
          <div className="text-xs text-muted-foreground">Mini juego diario · 5 preguntas</div>
        </div>
        <ArrowRight className="relative h-5 w-5 vapor-text" />
      </button>

      {/* === BANNER SUSCRIPCIONES === */}
      <SubscriptionBanner />

      {/* === TOP GLOBAL — compacto, 3 destacados === */}
      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="eyebrow eyebrow-warm inline-flex items-center gap-1.5">
              <Flame className="h-3 w-3" fill="currentColor" /> Top global
            </p>
          </div>
          <Link to="/popular" className="text-xs vapor-text hover:underline underline-offset-4 font-semibold inline-flex items-center gap-1">
            {language === 'es' ? 'Ver más' : language === 'en' ? 'See more' : language === 'fr' ? 'Voir plus' : 'Ver mais'} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {loading ? (
          <div className="h-[92px] rounded-3xl bg-muted animate-pulse" />
        ) : trendingSongs.length > 0 ? (
          <div className="rounded-3xl border border-border bg-card/50 backdrop-blur p-3 grid grid-cols-3 gap-2 border-primary/40">
            {trendingSongs.slice(0, 3).map((song, idx) => {
              const rankColor = idx === 0 ? 'vapor-text' : idx === 1 ? 'text-vapor-indigo' : 'text-vapor-cyan';
              return (
                <button
                  key={song.id}
                  onClick={() => goSong(song.id)}
                  className="group flex items-center gap-2 p-1 rounded-xl hover:bg-muted/40 transition-colors text-left min-w-0"
                >
                  <span className={`font-display font-bold text-lg leading-none ${rankColor} shrink-0 w-4 text-center`}>
                    {idx + 1}
                  </span>
                  <img
                    src={song.cover_url}
                    alt={song.title}
                    className="w-11 h-11 rounded-full object-cover shrink-0 border border-border"
                    loading="lazy"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-display font-bold text-[11px] leading-tight line-clamp-1">{song.title}</h4>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">{song.artist}</p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}
      </section>

      {/* === MÁS POPULAR EN YUSIOP (carrusel completo) === */}
      <PopularSection />

      {/* === TRENDING === */}
      <SongCarousel
        title={t('home.section.trending')}
        eyebrow={
          <span className="eyebrow eyebrow-warm inline-flex items-center gap-1.5">
            <Flame className="h-3 w-3" fill="currentColor" /> {language === 'es' ? 'Lo más sonado' : language === 'en' ? 'Most played' : language === 'fr' ? 'Les plus écoutés' : 'Mais tocadas'}
          </span>
        }
        seeAllHref="/catalog"
        seeAllLabel={language === 'es' ? 'Ver todo' : language === 'en' ? 'See all' : language === 'fr' ? 'Voir tout' : 'Ver tudo'}
        songs={trendingSongs}
        loading={loading}
        onSongClick={goSong}
        emptyText={
          language === 'es' ? 'Aún sin trending' :
          language === 'en' ? 'No trending yet' :
          language === 'fr' ? 'Pas encore de tendances' :
          'Sem tendências ainda'
        }
        showRank
      />


      {/* === TARJETAS DESTACADAS — carrusel === */}
      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="eyebrow mb-1">
              {language === 'es' ? '🎴 Colección' : language === 'en' ? '🎴 Collection' : language === 'fr' ? '🎴 Collection' : '🎴 Coleção'}
            </p>
            <h2 className="font-display text-xl font-bold tracking-tight">{t('home.section.cards')}</h2>
          </div>
          <Link to="/store" className="text-xs text-primary hover:underline underline-offset-4 font-semibold">
            {language === 'es' ? 'Ver todo' : 'See all'} →
          </Link>
        </div>

        <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 snap-x snap-mandatory scroll-smooth">
          <button
            onClick={() => navigate('/store')}
            className="snap-start group shrink-0 w-[160px] text-left transition-all md:hover:-translate-y-1 animate-fade-in"
            aria-label="Ver tarjeta Estándar en la tienda"
          >
            <DigitalCard code="YUSIOP-DEMO-A7K9X2" cardType="standard" downloadCredits={4} compact />
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
            className="snap-start group shrink-0 w-[160px] text-left transition-all md:hover:-translate-y-1 animate-fade-in"
            aria-label="Ver tarjeta Premium en la tienda"
          >
            <DigitalCard code="YUSIOP-DEMO-B3R7D9" cardType="premium" downloadCredits={10} compact />
            <div className="mt-2 px-0.5">
              <p className="font-display font-bold text-xs leading-tight">{t('card.premium')}</p>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-[10px] text-muted-foreground">10 {t('card.downloads')}</p>
                <span className="font-display font-bold text-xs vapor-text">10,00 €</span>
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* === CTA FINAL === */}
      <section className="relative overflow-hidden rounded-3xl border border-primary/30 p-6 text-center vapor-card">
        <div
          className="absolute inset-0 opacity-50 pointer-events-none"
          style={{ background: 'var(--gradient-vapor)' }}
        />
        <div className="relative">
          <p className="eyebrow mb-2">{t('home.footer.cta')}</p>
          <h3 className="font-display text-2xl font-bold leading-tight mb-4">
            {t('app.tagline').split(' ').slice(0, -1).join(' ')}{' '}
            <span className="vapor-text">{t('app.tagline').split(' ').pop()}</span>
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

export default Index;
