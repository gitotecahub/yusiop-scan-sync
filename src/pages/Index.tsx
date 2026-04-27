import { Link, useNavigate, useLocation } from 'react-router-dom';
import { QrCode, Music, Play, Sparkles, ArrowRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import DigitalCard from '@/components/DigitalCard';
import SubscriptionBanner from '@/components/SubscriptionBanner';
import PopularSection from '@/components/PopularSection';
import SongCarousel, { CarouselSong } from '@/components/SongCarousel';
import AdBanner from '@/components/ads/AdBanner';
import { useLanguageStore } from '@/stores/languageStore';

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
            .select(`song_id, songs!inner(id, title, cover_url, artists!inner(name), albums(cover_url))`)
            .limit(150),
          supabase
            .from('songs')
            .select(`id, title, cover_url, created_at, artists!inner(name), albums(cover_url)`)
            .order('created_at', { ascending: false })
            .limit(20),
        ]);

        // Trending agregado por descargas (contextual, todo el histórico)
        const counts: Record<string, { song: any; count: number }> = {};
        popularRes.data?.forEach((d: any) => {
          if (!counts[d.song_id]) counts[d.song_id] = { song: d.songs, count: 0 };
          counts[d.song_id].count++;
        });
        const trending: CarouselSong[] = Object.values(counts)
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
          .map((it, idx) => ({
            id: it.song.id,
            title: it.song.title,
            artist: it.song.artists.name,
            cover_url:
              it.song.cover_url ||
              it.song.albums?.cover_url ||
              `https://picsum.photos/300/300?random=${it.song.id}`,
            rank: idx + 1,
          }));
        setTrendingSongs(trending);

        // Recientes
        const recentsRaw: SongRow[] = (recentRes.data || []).map((s: any) => ({
          id: s.id,
          title: s.title,
          artist: s.artists.name,
          cover_url:
            s.cover_url ||
            s.albums?.cover_url ||
            `https://picsum.photos/400/400?random=${s.id}`,
          created_at: s.created_at,
        }));

        const recentBadge = (createdAt?: string) => {
          if (!createdAt) return undefined;
          const isNew = Date.now() - new Date(createdAt).getTime() < 1000 * 60 * 60 * 24 * 30;
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
            badge: recentBadge(s.created_at),
          }))
        );

        // Hero: top 5 lanzamientos más recientes
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

  const goSong = (id: string) => navigate('/catalog', { state: { highlightSongId: id } });

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
          <h1 className="display-xl text-[2.2rem] sm:text-4xl">
            {t('home.hero.title').split('\\n').map((line, i) => (
              <span key={i}>
                {line}
                {i === 0 && <br />}
              </span>
            ))}
            <span className="vapor-text">
              {language === 'es'
                ? 'en alta fidelidad'
                : language === 'en'
                ? 'in high fidelity'
                : language === 'fr'
                ? 'en haute fidélité'
                : 'em alta fidelidade'}
            </span>
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
              className="group relative overflow-hidden rounded-3xl px-4 py-4 flex items-center gap-2.5 border border-primary/40 bg-card/40 backdrop-blur-md hover:border-primary/70 hover:bg-card/70 transition-all hover:-translate-y-0.5"
            >
              <Music className="h-5 w-5 text-foreground" strokeWidth={2.2} />
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
        <div className="flex items-end justify-between">
          <div>
            <p className="eyebrow mb-1">✨ Destacado</p>
            <h2 className="font-display text-xl font-bold tracking-tight">
              {language === 'es' ? 'No te lo pierdas' : language === 'en' ? "Don't miss out" : language === 'fr' ? 'À ne pas manquer' : 'Não perca'}
            </h2>
          </div>
        </div>

        {loading ? (
          <div className="flex gap-3 -mx-5 px-5">
            <div className="shrink-0 w-full h-44 rounded-3xl bg-muted animate-pulse" />
          </div>
        ) : heroSlides.length > 0 ? (
          <div
            ref={heroRef}
            className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 snap-x snap-mandatory scroll-smooth"
          >
            {heroSlides.map((slide, idx) => (
              <button
                key={slide.id}
                onClick={() => goSong(slide.id)}
                className="snap-start group relative shrink-0 w-[88%] sm:w-[420px] h-44 rounded-3xl overflow-hidden border border-border md:hover:border-primary/50 transition-all text-left animate-fade-in"
              >
                <img
                  src={slide.cover_url}
                  alt={slide.title}
                  className="absolute inset-0 w-full h-full object-cover md:group-hover:scale-105 transition-all duration-700"
                  loading="lazy"
                />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
                <div className="absolute top-3 left-3">
                  <span className="chip chip-vapor !text-[9px]">
                    <Sparkles className="h-2.5 w-2.5" />{' '}
                    {language === 'es' ? 'NUEVO' : language === 'en' ? 'NEW' : language === 'fr' ? 'NOUVEAU' : 'NOVO'}
                  </span>
                </div>
                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-display font-bold text-lg text-white drop-shadow-lg leading-tight line-clamp-1">
                      {slide.title}
                    </h3>
                    <p className="text-xs text-white/85 mt-0.5 line-clamp-1">{slide.artist}</p>
                  </div>
                  <div className="shrink-0 w-11 h-11 rounded-full bg-white/95 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="h-5 w-5 text-foreground ml-0.5" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : null}
      </section>

      {/* === BANNER SUSCRIPCIONES === */}
      <SubscriptionBanner />

      {/* === MÁS POPULAR EN YUSIOP === */}
      <PopularSection />

      {/* === TRENDING — basado en descargas globales === */}
      <SongCarousel
        title={t('home.section.trending')}
        eyebrow={
          language === 'es' ? '📈 Lo más sonado' :
          language === 'en' ? '📈 Most played' :
          language === 'fr' ? '📈 Les plus écoutés' :
          '📈 Mais tocadas'
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

      {/* === NUEVOS LANZAMIENTOS === */}
      <SongCarousel
        title={t('home.section.recent')}
        eyebrow={
          language === 'es' ? '🆕 Nuevos lanzamientos' :
          language === 'en' ? '🆕 New releases' :
          language === 'fr' ? '🆕 Nouveautés' :
          '🆕 Novos lançamentos'
        }
        seeAllHref="/catalog"
        seeAllLabel={language === 'es' ? 'Ver todo' : language === 'en' ? 'See all' : language === 'fr' ? 'Voir tout' : 'Ver tudo'}
        songs={recentSongs}
        loading={loading}
        onSongClick={goSong}
        emptyText={language === 'es' ? 'Pronto habrá lanzamientos' : 'Coming soon'}
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
