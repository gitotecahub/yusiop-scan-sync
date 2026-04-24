import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Users, Euro, MapPin, BarChart3, TrendingUp, Coins, ShieldAlert, Gift, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/authStore';
import { useModeStore } from '@/stores/modeStore';
import { supabase } from '@/integrations/supabase/client';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { formatEURNumber, formatXAFNumber } from '@/lib/currency';
import { useLanguageStore } from '@/stores/languageStore';

type Stats = {
  totals: {
    total_downloads: number;
    real_downloads?: number;
    promotional_downloads?: number;
    suspicious_downloads?: number;
    unique_listeners: number;
    total_revenue_cents: number;
  };
  by_song: { song_id: string; song_title: string; downloads: number; real_downloads?: number; revenue_cents: number }[];
  by_country: { country_code: string; country_name: string; downloads: number }[];
  by_age: { bucket: string; downloads: number }[];
  by_gender: { gender: string; downloads: number }[];
  by_day: { day: string; downloads: number; revenue_cents: number }[];
  pool_pending?: { pending_revenue_cents: number; pending_downloads: number } | null;
};

const PIE_COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#f59e0b', '#10b981', '#ef4444', '#94a3b8'];

const formatEuros = (cents: number) => formatEURNumber((cents || 0) / 100);
const formatXaf = (cents: number) => formatXAFNumber((cents || 0) / 100);

const flagEmoji = (code: string) => {
  if (!code || code.length !== 2) return '🏳️';
  const A = 0x1f1e6;
  const a = 'A'.charCodeAt(0);
  return String.fromCodePoint(A + (code.toUpperCase().charCodeAt(0) - a)) +
    String.fromCodePoint(A + (code.toUpperCase().charCodeAt(1) - a));
};

const ArtistStats = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { isArtist } = useModeStore();
  const { t } = useLanguageStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [artistName, setArtistName] = useState<string>('');
  const [stats, setStats] = useState<Stats | null>(null);

  const GENDER_LABEL: Record<string, string> = {
    male: t('artist.genderM'),
    female: t('artist.genderF'),
    non_binary: t('artist.genderNB'),
    prefer_not_to_say: t('artist.genderPNS'),
    unknown: t('artist.genderUnknown'),
  };

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      setError(null);
      try {
        // 1. Obtener el nombre de artista aprobado del usuario
        const { data: req } = await supabase
          .from('artist_requests')
          .select('artist_name')
          .eq('user_id', user.id)
          .eq('status', 'approved')
          .order('reviewed_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        const name = req?.artist_name;
        if (!name) {
          setError(t('artist.profileNotFound'));
          setLoading(false);
          return;
        }
        setArtistName(name);

        // 2. Buscar el id del artista en el catálogo
        const { data: artist } = await supabase
          .from('artists')
          .select('id')
          .ilike('name', name)
          .maybeSingle();
        if (!artist?.id) {
          setStats({
            totals: { total_downloads: 0, unique_listeners: 0, total_revenue_cents: 0 },
            by_song: [], by_country: [], by_age: [], by_gender: [], by_day: [],
            pool_pending: null,
          });
          setLoading(false);
          return;
        }

        // 3. Llamar a la función agregada
        const { data, error: rpcErr } = await supabase.rpc('get_artist_stats' as any, {
          p_artist_id: artist.id,
        });
        if (rpcErr) throw rpcErr;
        setStats(data as unknown as Stats);
      } catch (e: any) {
        setError(e?.message || t('artist.errorLoadingStats'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const topCountry = useMemo(
    () => stats?.by_country?.[0],
    [stats],
  );

  if (!isArtist) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card><CardContent className="p-6">{t('artist.noAccess')}</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => navigate('/artist')} className="-ml-3">
          <ArrowLeft className="h-4 w-4 mr-2" /> {t('artist.panelLabel')}
        </Button>
        <span className="text-xs text-muted-foreground">{t('artist.statsLabel')}</span>
      </div>

      <div className="blob-card p-6 mb-6">
        <p className="eyebrow mb-1">{t('artist.audienceEyebrow')}</p>
        <h1 className="display-xl text-3xl">{artistName || 'Artista'}</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {t('artist.audienceSubtitle')}
        </p>
      </div>

      {loading && (
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" />
        </div>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="p-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {!loading && !error && stats && (
        <>
          {/* KPI Cards */}
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2"><Download className="h-5 w-5 text-primary" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('artist.totalDownloadsLabel')}</p>
                    <p className="text-2xl font-bold">{stats.totals.total_downloads}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2"><Users className="h-5 w-5 text-primary" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('artist.uniqueListeners')}</p>
                    <p className="text-2xl font-bold">{stats.totals.unique_listeners}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2"><Euro className="h-5 w-5 text-primary" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('artist.estIncome')}</p>
                    <p className="text-2xl font-bold leading-tight">{formatEuros(stats.totals.total_revenue_cents)}</p>
                    <p className="text-xs text-muted-foreground/80 tabular-nums">{formatXaf(stats.totals.total_revenue_cents)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Desglose por tipo de descarga (antifraude) */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <p className="text-xs text-muted-foreground">{t('artist.real')}</p>
                </div>
                <p className="text-xl font-bold">{stats.totals.real_downloads ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">{t('artist.realDesc')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Gift className="h-4 w-4 text-accent-foreground" />
                  <p className="text-xs text-muted-foreground">{t('artist.promo')}</p>
                </div>
                <p className="text-xl font-bold">{stats.totals.promotional_downloads ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">{t('artist.promoDesc')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldAlert className="h-4 w-4 text-destructive" />
                  <p className="text-xs text-muted-foreground">{t('artist.suspicious')}</p>
                </div>
                <p className="text-xl font-bold">{stats.totals.suspicious_downloads ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">{t('artist.suspiciousDesc')}</p>
              </CardContent>
            </Card>
          </div>

          {/* Pool pendiente de colaboraciones */}
          {stats.pool_pending && stats.pool_pending.pending_revenue_cents > 0 && (
            <Card className="mb-6 border-primary/40 bg-primary/5">
              <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2"><Coins className="h-5 w-5 text-primary" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('artist.poolPending')}</p>
                    <p className="text-xl font-bold leading-tight">{formatEuros(stats.pool_pending.pending_revenue_cents)}</p>
                    <p className="text-xs text-muted-foreground/80 tabular-nums">{formatXaf(stats.pool_pending.pending_revenue_cents)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{stats.pool_pending.pending_downloads} {t('artist.poolDesc')}</p>
                  </div>
                </div>
                <Button size="sm" onClick={() => navigate('/artist/collaborations')}>
                  {t('artist.poolGoClaim')}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Evolución 30 días */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> {t('artist.last30Days')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.by_day.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('artist.noDownloads30')}</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.by_day}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Line type="monotone" dataKey="downloads" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name={t('artist.downloadsLegend')} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top canciones */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" /> {t('artist.topSongs')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.by_song.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('artist.noDownloadsYet')}</p>
              ) : (
                <div className="space-y-2">
                  {stats.by_song.map((s, i) => {
                    const max = stats.by_song[0].downloads || 1;
                    const pct = (s.downloads / max) * 100;
                    return (
                      <div key={s.song_id} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-muted-foreground w-5 text-right">{i + 1}</span>
                            <span className="truncate font-medium">{s.song_title}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 ml-3">
                            <span className="flex flex-col items-end leading-tight">
                              <span className="text-xs text-muted-foreground tabular-nums">{formatEuros(s.revenue_cents)}</span>
                              <span className="text-[10px] text-muted-foreground/70 tabular-nums">{formatXaf(s.revenue_cents)}</span>
                            </span>
                            <Badge variant="secondary">{s.downloads}</Badge>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Geografía */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> {t('artist.countries')}
                {topCountry && (
                  <span className="ml-auto text-xs text-muted-foreground font-normal">
                    {t('artist.top')}: {flagEmoji(topCountry.country_code)} {topCountry.country_name}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.by_country.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('artist.noGeo')}</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                  {stats.by_country.slice(0, 12).map((c) => {
                    const max = stats.by_country[0].downloads || 1;
                    const pct = (c.downloads / max) * 100;
                    return (
                      <div key={c.country_code} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 min-w-0 truncate">
                            <span>{flagEmoji(c.country_code)}</span>
                            <span className="truncate">{c.country_name}</span>
                          </span>
                          <Badge variant="secondary">{c.downloads}</Badge>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="mt-4 text-xs text-muted-foreground">
                {t('artist.geoNote')}
              </p>
            </CardContent>
          </Card>

          {/* Demografía */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">{t('artist.age')}</CardTitle></CardHeader>
              <CardContent>
                {stats.by_age.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('artist.noData')}</p>
                ) : (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.by_age}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="bucket" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                        <Bar dataKey="downloads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">{t('artist.gender')}</CardTitle></CardHeader>
              <CardContent>
                {stats.by_gender.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('artist.noData')}</p>
                ) : (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.by_gender.map((g) => ({ ...g, name: GENDER_LABEL[g.gender] || g.gender }))}
                          dataKey="downloads"
                          nameKey="name"
                          innerRadius={40}
                          outerRadius={75}
                          paddingAngle={2}
                        >
                          {stats.by_gender.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <p className="mt-6 text-xs text-muted-foreground text-center">
            Los datos demográficos se basan en los oyentes que han rellenado su edad y género en el perfil.
          </p>
        </>
      )}
    </div>
  );
};

export default ArtistStats;
