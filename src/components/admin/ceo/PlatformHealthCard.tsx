import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { HealthScore } from '@/lib/ceoCenter';
import { Activity, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  data?: HealthScore;
  isLoading: boolean;
}

const STATUS_CONFIG = {
  excellent: { label: 'Excelente', icon: CheckCircle2, color: 'text-emerald-400', ring: 'ring-emerald-400/30', glow: 'from-emerald-500/20' },
  stable: { label: 'Estable', icon: Activity, color: 'text-sky-400', ring: 'ring-sky-400/30', glow: 'from-sky-500/20' },
  attention: { label: 'Atención', icon: AlertTriangle, color: 'text-amber-400', ring: 'ring-amber-400/30', glow: 'from-amber-500/20' },
  risk: { label: 'Riesgo', icon: ShieldAlert, color: 'text-red-400', ring: 'ring-red-400/30', glow: 'from-red-500/20' },
} as const;

export function PlatformHealthCard({ data, isLoading }: Props) {
  if (isLoading || !data) {
    return (
      <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-background to-muted/30 p-6">
        <Skeleton className="h-32 w-full" />
      </Card>
    );
  }

  const cfg = STATUS_CONFIG[data.status];
  const Icon = cfg.icon;
  const circumference = 2 * Math.PI * 56;
  const offset = circumference - (data.score / 100) * circumference;

  return (
    <Card
      className={cn(
        'relative overflow-hidden border-border/50 bg-gradient-to-br from-background via-background to-muted/40 p-6',
        'ring-1', cfg.ring,
      )}
    >
      <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-60', cfg.glow)} />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
        {/* Score ring */}
        <div className="relative mx-auto sm:mx-0 h-36 w-36 shrink-0">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 128 128">
            <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="none" className="text-muted/40" />
            <circle
              cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="none" strokeLinecap="round"
              className={cfg.color}
              strokeDasharray={circumference} strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 1s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold tracking-tight">{data.score}</span>
            <span className="text-xs text-muted-foreground">/ 100</span>
          </div>
        </div>

        <div className="flex-1 space-y-2 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <Icon className={cn('h-5 w-5', cfg.color)} />
            <span className={cn('text-sm font-semibold uppercase tracking-wide', cfg.color)}>{cfg.label}</span>
          </div>
          <h3 className="text-xl font-semibold">Salud general de la plataforma</h3>
          <p className="text-sm text-muted-foreground">{data.message}</p>
        </div>
      </div>
    </Card>
  );
}
