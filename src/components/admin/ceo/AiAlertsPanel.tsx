import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { CeoAlert } from '@/lib/ceoCenter';
import { AlertTriangle, Bell, ChevronRight, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  data?: CeoAlert[];
  isLoading: boolean;
}

const SEV = {
  low: { cls: 'bg-muted text-muted-foreground border-border', label: 'Baja' },
  medium: { cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30', label: 'Media' },
  high: { cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30', label: 'Alta' },
  critical: { cls: 'bg-red-500/15 text-red-300 border-red-500/30', label: 'Crítica' },
} as const;

export function AiAlertsPanel({ data, isLoading }: Props) {
  return (
    <Card className="border-border/50 bg-background/60 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Bell className="h-4 w-4 text-primary" />
        <h3 className="text-base font-semibold">Alertas IA</h3>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : !data || data.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <ShieldAlert className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No hay alertas en este periodo.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {data.map((a) => {
            const cfg = SEV[a.severity];
            return (
              <li key={a.id} className="rounded-lg border border-border/50 bg-background/40 p-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className={cn('mt-0.5 h-4 w-4 shrink-0',
                    a.severity === 'critical' ? 'text-red-400'
                    : a.severity === 'high' ? 'text-amber-400'
                    : 'text-sky-400'
                  )} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium">{a.title}</span>
                      <Badge variant="outline" className={cn('shrink-0 text-[10px]', cfg.cls)}>{cfg.label}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{a.description}</p>
                    <p className="mt-1 text-xs italic text-muted-foreground/80">→ {a.recommendation}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
