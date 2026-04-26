import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CeoKpis, computeDelta, formatCurrency, formatNumber } from '@/lib/ceoCenter';
import {
  ArrowDownRight, ArrowUpRight, CreditCard, Crown, Download,
  Music2, Sparkles, TrendingUp, Users, Wallet, Zap, Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  data?: CeoKpis;
  isLoading: boolean;
}

interface KpiDef {
  key: string;
  label: string;
  value: string;
  delta: number | null;
  icon: React.ElementType;
  tone: 'positive' | 'neutral' | 'alert';
}

export function StrategicKpiGrid({ data, isLoading }: Props) {
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  const kpis: KpiDef[] = [
    { key: 'rev_total', label: 'Ingresos totales', value: formatCurrency(data.revenue_total), delta: computeDelta(data.revenue_total, data.revenue_total_prev), icon: Wallet, tone: 'positive' },
    { key: 'rev_cards', label: 'Ingresos tarjetas', value: formatCurrency(data.revenue_cards), delta: computeDelta(data.revenue_cards, data.revenue_cards_prev), icon: CreditCard, tone: 'neutral' },
    { key: 'rev_subs', label: 'Ingresos suscripciones', value: formatCurrency(data.revenue_subscriptions), delta: computeDelta(data.revenue_subscriptions, data.revenue_subscriptions_prev), icon: Sparkles, tone: 'neutral' },
    { key: 'rev_express', label: 'Ingresos express', value: formatCurrency(data.revenue_express), delta: computeDelta(data.revenue_express, data.revenue_express_prev), icon: Zap, tone: 'neutral' },
    { key: 'downloads', label: 'Descargas', value: formatNumber(data.downloads), delta: computeDelta(data.downloads, data.downloads_prev), icon: Download, tone: 'neutral' },
    { key: 'active_users', label: 'Usuarios activos', value: formatNumber(data.active_users), delta: computeDelta(data.active_users, data.active_users_prev), icon: Users, tone: 'neutral' },
    { key: 'active_artists', label: 'Artistas activos', value: formatNumber(data.active_artists), delta: null, icon: Music2, tone: 'neutral' },
    { key: 'avg_ticket', label: 'Ticket medio', value: formatCurrency(data.avg_ticket), delta: null, icon: Target, tone: 'neutral' },
    { key: 'conversion', label: 'Tasa conversión', value: `${data.conversion_rate}%`, delta: null, icon: TrendingUp, tone: 'neutral' },
    { key: 'profit', label: 'Beneficio estimado', value: formatCurrency(data.estimated_profit), delta: null, icon: Crown, tone: 'positive' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      {kpis.map((k) => (
        <KpiCard key={k.key} kpi={k} />
      ))}
    </div>
  );
}

function KpiCard({ kpi }: { kpi: KpiDef }) {
  const Icon = kpi.icon;
  const isUp = kpi.delta != null && kpi.delta >= 0;
  const isDown = kpi.delta != null && kpi.delta < 0;
  return (
    <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-background to-muted/20 p-3 transition-colors hover:border-primary/30">
      <div className="flex items-start justify-between gap-2">
        <Icon className={cn(
          'h-4 w-4',
          kpi.tone === 'positive' ? 'text-emerald-400' : kpi.tone === 'alert' ? 'text-red-400' : 'text-primary',
        )} />
        {kpi.delta != null && (
          <span className={cn(
            'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
            isUp ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400',
          )}>
            {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(kpi.delta).toFixed(0)}%
          </span>
        )}
      </div>
      <div className="mt-2 text-lg font-bold tracking-tight">{kpi.value}</div>
      <div className="text-[11px] text-muted-foreground">{kpi.label}</div>
    </Card>
  );
}
