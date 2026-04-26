import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TopSong, formatCurrency, formatNumber } from '@/lib/ceoCenter';
import { Flame, Music2, Rocket, Search, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  data?: TopSong[];
  isLoading: boolean;
}

const STATUS = {
  viral: { label: 'Viral', icon: Flame, cls: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30' },
  promote: { label: 'Promocionar', icon: Rocket, cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  normal: { label: 'Normal', icon: TrendingUp, cls: 'bg-muted text-muted-foreground border-border' },
  review: { label: 'Revisar', icon: Search, cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
} as const;

export function StrategicTopSongs({ data, isLoading }: Props) {
  return (
    <Card className="border-border/50 bg-background/60 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Top canciones estratégicas</h3>
          <p className="text-xs text-muted-foreground">Ordenadas por descargas y potencial de crecimiento</p>
        </div>
        <Music2 className="h-4 w-4 text-muted-foreground" />
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : !data || data.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Sin actividad en este periodo.</p>
      ) : (
        <ul className="divide-y divide-border/40">
          {data.map((s, i) => {
            const cfg = STATUS[s.ai_status];
            const Icon = cfg.icon;
            return (
              <li key={s.song_id} className="flex items-center gap-3 py-3">
                <span className="w-5 shrink-0 text-center text-xs font-bold text-muted-foreground">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{s.title}</div>
                  <div className="truncate text-xs text-muted-foreground">{s.artist_name}</div>
                </div>
                <div className="hidden sm:flex flex-col items-end text-xs">
                  <span className="font-semibold">{formatNumber(s.downloads_now)}</span>
                  <span className="text-muted-foreground">descargas</span>
                </div>
                <div className="hidden md:flex flex-col items-end text-xs">
                  <span className={cn('font-semibold', s.growth_pct >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {s.growth_pct >= 0 ? '+' : ''}{s.growth_pct.toFixed(0)}%
                  </span>
                  <span className="text-muted-foreground">{formatCurrency(s.estimated_revenue)}</span>
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
