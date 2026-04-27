import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  Download,
  Euro,
  Users,
  Gift,
  QrCode,
  Music,
  Receipt,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  fetchRevenueSeries,
  fetchDownloadsSeries,
  fetchTopSongs,
  fetchQrStats,
  fetchNewUsers,
  RangeKey,
} from '@/lib/adminAnalytics';

const RANGES: { key: RangeKey; label: string }[] = [
  { key: '7d', label: '7 días' },
  { key: '30d', label: '30 días' },
  { key: '90d', label: '90 días' },
  { key: '1y', label: '1 año' },
];

import { formatEURNumber, formatXAFNumber } from '@/lib/currency';

const formatEur = (n: number) => formatEURNumber(n);
const formatXaf = (n: number) => formatXAFNumber(n);

const formatShortDate = (d: string) => {
  const date = new Date(d);
  return `${date.getDate()}/${date.getMonth() + 1}`;
};

const Dashboard = () => {
  const [range, setRange] = useState<RangeKey>('30d');
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState<{
    series: { date: string; value: number }[];
    totalEur: number;
    count: number;
    avgTicketEur: number;
    breakdown?: {
      cards_eur: number; cards_count: number;
      express_eur: number; express_count: number;
      promo_eur: number; promo_count: number;
      subs_eur: number; subs_count: number;
    };
  }>({ series: [], totalEur: 0, count: 0, avgTicketEur: 0 });
  const [downloads, setDownloads] = useState<{
    series: { date: string; value: number }[];
    total: number;
  }>({ series: [], total: 0 });
  const [topSongs, setTopSongs] = useState<
    { id: string; title: string; artist: string; count: number }[]
  >([]);
  const [qr, setQr] = useState({
    total: 0,
    activated: 0,
    activationRate: 0,
    gifts: 0,
    giftsRedeemed: 0,
    giftRedemptionRate: 0,
  });
  const [newUsers, setNewUsers] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [rev, dls, top, qrStats, nu] = await Promise.all([
          fetchRevenueSeries(range),
          fetchDownloadsSeries(range),
          fetchTopSongs(range),
          fetchQrStats(),
          fetchNewUsers(range),
        ]);
        if (cancelled) return;
        setRevenue(rev);
        setDownloads(dls);
        setTopSongs(top);
        setQr(qrStats);
        setNewUsers(nu);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [range]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-yusiop-primary to-yusiop-accent bg-clip-text text-transparent">
            KPI Dashboard
          </h1>
          <p className="text-muted-foreground">
            Métricas de negocio y actividad de la plataforma
          </p>
        </div>
        <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border border-border/50">
          {RANGES.map((r) => (
            <Button
              key={r.key}
              variant={range === r.key ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setRange(r.key)}
              className="h-8"
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Ingresos"
          value={formatEur(revenue.totalEur)}
          subValue={formatXaf(revenue.totalEur)}
          icon={Euro}
          hint={`${revenue.count} compras`}
          loading={loading}
          accent
        />
        <KpiCard
          title="Ticket promedio"
          value={formatEur(revenue.avgTicketEur)}
          subValue={formatXaf(revenue.avgTicketEur)}
          icon={Receipt}
          hint="Por compra"
          loading={loading}
        />
        <KpiCard
          title="Descargas"
          value={String(downloads.total)}
          icon={Download}
          hint="Periodo seleccionado"
          loading={loading}
        />
        <KpiCard
          title="Usuarios nuevos"
          value={String(newUsers)}
          icon={Users}
          hint="Registros nuevos"
          loading={loading}
        />
      </div>

      {/* Desglose por motor de ingresos */}
      {revenue.breakdown && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Euro className="h-4 w-4 text-primary" />
              Desglose de ingresos
            </CardTitle>
            <CardDescription>Por motor en el periodo seleccionado</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <RevenueEngineTile label="Tarjetas QR" eur={revenue.breakdown.cards_eur} count={revenue.breakdown.cards_count} loading={loading} />
            <RevenueEngineTile label="Express" eur={revenue.breakdown.express_eur} count={revenue.breakdown.express_count} loading={loading} />
            <RevenueEngineTile label="Promo lanzamientos" eur={revenue.breakdown.promo_eur} count={revenue.breakdown.promo_count} loading={loading} />
            <RevenueEngineTile label="Suscripciones" eur={revenue.breakdown.subs_eur} count={revenue.breakdown.subs_count} loading={loading} />
          </CardContent>
        </Card>
      )}

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Ingresos por día
            </CardTitle>
            <CardDescription>Compras pagadas en {range}</CardDescription>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenue.series}>
                <defs>
                  <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDate}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    color: 'hsl(var(--popover-foreground))',
                  }}
                  formatter={(v: number) => [formatEur(v), 'Ingresos']}
                  labelFormatter={(l) => formatShortDate(String(l))}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#revGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-4 w-4 text-primary" />
              Descargas por día
            </CardTitle>
            <CardDescription>Descargas totales en {range}</CardDescription>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={downloads.series}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDate}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    color: 'hsl(var(--popover-foreground))',
                  }}
                  formatter={(v: number) => [v, 'Descargas']}
                  labelFormatter={(l) => formatShortDate(String(l))}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* QR + Top songs */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-4 w-4 text-primary" />
              Tarjetas QR
            </CardTitle>
            <CardDescription>Estado actual de las tarjetas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <StatRow label="Total creadas" value={qr.total} />
            <StatRow label="Activadas" value={qr.activated} accent={`${qr.activationRate}%`} />
            <div className="h-px bg-border" />
            <div className="flex items-center gap-2 text-sm font-medium">
              <Gift className="h-4 w-4 text-primary" />
              Regalos
            </div>
            <StatRow label="Total regalos" value={qr.gifts} />
            <StatRow
              label="Canjeados"
              value={qr.giftsRedeemed}
              accent={`${qr.giftRedemptionRate}%`}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-4 w-4 text-primary" />
              Top canciones más descargadas
            </CardTitle>
            <CardDescription>Ranking del periodo seleccionado</CardDescription>
          </CardHeader>
          <CardContent>
            {topSongs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Sin descargas en este periodo
              </p>
            ) : (
              <div className="space-y-2">
                {topSongs.map((s, idx) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-7 h-7 flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{s.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.artist}</p>
                    </div>
                    <Badge variant="secondary">{s.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const KpiCard = ({
  title,
  value,
  subValue,
  icon: Icon,
  hint,
  loading,
  accent,
}: {
  title: string;
  value: string;
  subValue?: string;
  icon: any;
  hint?: string;
  loading?: boolean;
  accent?: boolean;
}) => (
  <Card className={accent ? 'border-primary/30 bg-primary/5' : ''}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className={`h-4 w-4 ${accent ? 'text-primary' : 'text-muted-foreground'}`} />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold leading-tight">{loading ? '—' : value}</div>
      {!loading && subValue && (
        <div className="text-xs text-muted-foreground/80 tabular-nums mt-0.5">{subValue}</div>
      )}
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </CardContent>
  </Card>
);

const StatRow = ({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: string;
}) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-muted-foreground">{label}</span>
    <div className="flex items-center gap-2">
      <span className="font-semibold">{value}</span>
      {accent && (
        <Badge variant="secondary" className="text-xs">
          {accent}
        </Badge>
      )}
    </div>
  </div>
);

export default Dashboard;
