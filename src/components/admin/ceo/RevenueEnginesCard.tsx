import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { RevenueEngine, formatCurrency } from '@/lib/ceoCenter';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  data?: RevenueEngine[];
  isLoading: boolean;
}

const COLORS: Record<RevenueEngine['engine'], string> = {
  cards: 'from-violet-500 to-fuchsia-500',
  subscriptions: 'from-cyan-500 to-blue-500',
  express: 'from-amber-500 to-orange-500',
};

export function RevenueEnginesCard({ data, isLoading }: Props) {
  return (
    <Card className="border-border/50 bg-background/60 p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold">Motores de ingresos</h3>
        <p className="text-xs text-muted-foreground">Distribución por fuente y tendencia vs periodo anterior</p>
      </div>

      {isLoading || !data ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((eng) => {
            const trendIcon = eng.trend == null ? Minus : eng.trend >= 0 ? ArrowUp : ArrowDown;
            const TrendIcon = trendIcon;
            return (
              <div key={eng.engine} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn('inline-block h-2 w-2 rounded-full bg-gradient-to-r', COLORS[eng.engine])} />
                    <span className="text-sm font-medium truncate">{eng.label}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-semibold">{formatCurrency(eng.revenue)}</span>
                    <span className={cn(
                      'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                      eng.trend == null ? 'bg-muted text-muted-foreground'
                        : eng.trend >= 0 ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-red-500/10 text-red-400',
                    )}>
                      <TrendIcon className="h-3 w-3" />
                      {eng.trend == null ? '—' : `${Math.abs(eng.trend).toFixed(0)}%`}
                    </span>
                  </div>
                </div>
                <div className="relative h-1.5 overflow-hidden rounded-full bg-muted/40">
                  <div
                    className={cn('h-full rounded-full bg-gradient-to-r', COLORS[eng.engine])}
                    style={{ width: `${Math.min(eng.percent, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">{eng.percent}% del total</span>
                  <span className="text-muted-foreground italic line-clamp-1 max-w-[60%] text-right">{eng.recommendation}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
