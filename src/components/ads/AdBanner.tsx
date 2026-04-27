import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone, ArrowRight, Music } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import RequestAdDialog from './RequestAdDialog';

type Campaign = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  cta_text: string | null;
  cta_url: string | null;
  campaign_type: 'artist_release' | 'external_business' | 'yusiop_service';
};

const ROTATE_MS = 5000;

const AdBanner = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [index, setIndex] = useState(0);
  const [openRequest, setOpenRequest] = useState(false);
  const trackedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const fetchCampaigns = async () => {
      const { data } = await supabase.rpc('get_active_ad_campaigns', {
        p_placement: 'home_top_banner',
        p_limit: 5,
      });
      setCampaigns((data as Campaign[]) ?? []);
    };
    fetchCampaigns();
  }, []);

  // Rotación
  useEffect(() => {
    if (campaigns.length < 2) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % campaigns.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [campaigns.length]);

  // Track impresión (1 vez por sesión por campaña)
  useEffect(() => {
    if (campaigns.length === 0) return;
    const current = campaigns[index];
    if (!current || trackedRef.current.has(current.id)) return;
    trackedRef.current.add(current.id);
    supabase.rpc('track_ad_impression', { p_campaign_id: current.id });
  }, [index, campaigns]);

  const handleClick = (c: Campaign) => {
    supabase.rpc('track_ad_click', { p_campaign_id: c.id });
    if (!c.cta_url) return;
    if (c.cta_url.startsWith('http://') || c.cta_url.startsWith('https://')) {
      window.open(c.cta_url, '_blank', 'noopener,noreferrer');
    } else {
      navigate(c.cta_url);
    }
  };

  // Banner fallback YUSIOP cuando no hay campañas
  if (campaigns.length === 0) {
    return (
      <>
        <section className="-mx-5 px-5">
          <button
            onClick={() => setOpenRequest(true)}
            className="relative w-full overflow-hidden rounded-3xl border border-primary/30 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/60"
            style={{
              background:
                'linear-gradient(135deg, hsl(250 95% 25% / 0.7), hsl(232 90% 25% / 0.6) 50%, hsl(188 85% 30% / 0.5))',
            }}
          >
            <div
              className="absolute inset-0 opacity-40 pointer-events-none"
              style={{ background: 'var(--gradient-vapor, linear-gradient(135deg, hsl(280 85% 50% / 0.3), hsl(188 85% 50% / 0.2)))' }}
            />
            <div className="relative flex items-center gap-4">
              <div className="shrink-0 w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center">
                <Megaphone className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-white/70 font-semibold">
                  YUSIOP Ads
                </p>
                <h3 className="font-display text-base sm:text-lg font-bold text-white leading-tight">
                  Promociona tu música en YUSIOP
                </h3>
                <p className="text-xs text-white/80 mt-0.5 line-clamp-1">
                  Llega a más oyentes con un banner premium
                </p>
              </div>
              <div className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white text-slate-900 text-xs font-bold">
                Quiero anunciarme <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          </button>
        </section>
        <RequestAdDialog open={openRequest} onOpenChange={setOpenRequest} />
      </>
    );
  }

  const current = campaigns[index];

  return (
    <section className="-mx-5 px-5">
      <div className="relative">
        <button
          onClick={() => handleClick(current)}
          className="relative w-full overflow-hidden rounded-3xl border border-primary/30 transition-all hover:-translate-y-0.5 hover:border-primary/60 text-left animate-fade-in"
          aria-label={current.title}
        >
          {/* Background */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(135deg, hsl(250 95% 30%), hsl(232 90% 30%) 50%, hsl(188 85% 35%))',
            }}
          />
          {current.image_url && (
            <img
              src={current.image_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-luminosity"
              loading="lazy"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-background/30 to-transparent" />

          <div className="relative flex items-center gap-4 p-5 min-h-[110px]">
            <div className="shrink-0 w-14 h-14 rounded-2xl overflow-hidden bg-white/10 backdrop-blur-md flex items-center justify-center">
              {current.image_url ? (
                <img src={current.image_url} alt="" className="w-full h-full object-cover" />
              ) : current.campaign_type === 'artist_release' ? (
                <Music className="h-6 w-6 text-white" />
              ) : (
                <Megaphone className="h-6 w-6 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-white/80 font-semibold">
                {current.campaign_type === 'artist_release'
                  ? '🎵 Lanzamiento destacado'
                  : current.campaign_type === 'yusiop_service'
                  ? '✨ YUSIOP'
                  : '📣 Patrocinado'}
              </p>
              <h3 className="font-display text-base sm:text-lg font-bold text-white leading-tight line-clamp-1">
                {current.title}
              </h3>
              {current.subtitle && (
                <p className="text-xs text-white/80 mt-0.5 line-clamp-1">{current.subtitle}</p>
              )}
            </div>
            {current.cta_text && (
              <div className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white text-slate-900 text-xs font-bold">
                {current.cta_text} <ArrowRight className="h-3 w-3" />
              </div>
            )}
          </div>
        </button>

        {/* Dots */}
        {campaigns.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-2">
            {campaigns.map((c, i) => (
              <button
                key={c.id}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30'
                }`}
                aria-label={`Banner ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default AdBanner;
