import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TopArtist, formatCurrency, formatNumber } from '@/lib/ceoCenter';
import { CheckCircle2, Search, Sparkles, TrendingUp, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  data?: TopArtist[];
  isLoading: boolean;
}

const REC = {
  high_potential: { label: 'Alto potencial', icon: Sparkles, cls: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30' },
  invest: { label: 'Invertir promo', icon: TrendingUp, cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  maintain: { label: 'Mantener', icon: CheckCircle2, cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  review: { label: 'Revisar', icon: Search, cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
} as const;

export function StrategicTopArtists({ data, isLoading }: Props) {
  return (
    <Card className="border-border/50 bg-background/60 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Top artistas estratégicos</h3>
          <p className="text-xs text-muted-foreground">Ordenados por valor de negocio</p>
        </div>
        <UserCircle className="h-4 w-4 text-muted-foreground" />
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : !data || data.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Sin artistas activos en este periodo.</p>
      ) : (
        <ul className="divide-y divide-border/40">
          {data.map((a, i) => {
            const cfg = REC[a.recommendation];
            const Icon = cfg.icon;
            return (
              <li key={a.artist_id} className="flex items-center gap-3 py-3">
                <span className="w-5 shrink-0 text-center text-xs font-bold text-muted-foreground">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{a.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {a.active_songs} canciones · {formatNumber(a.downloads_now)} descargas
                  </div>
                </div>
                <div className="hidden md:flex flex-col items-end text-xs">
                  <span className={cn('font-semibold', a.growth_pct >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {a.growth_pct >= 0 ? '+' : ''}{a.growth_pct.toFixed(0)}%
                  </span>
                  <span className="text-muted-foreground">{formatCurrency(a.estimated_revenue)}</span>
                </div>
                <Badge variant="outline" className={cn('shrink-0 gap-1', cfg.cls)}>
                  <Icon className="h-3 w-3" />
                  <span className="hidden sm:inline">{cfg.label}</span>
                </Badge>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
