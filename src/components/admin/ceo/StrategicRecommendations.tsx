import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Recommendation } from '@/lib/ceoCenter';
import { Copy, Lightbulb, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface Props {
  data?: Recommendation[];
  isLoading: boolean;
}

const TONE = {
  high: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
  medium: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  low: 'bg-muted text-muted-foreground border-border',
} as const;

export function StrategicRecommendations({ data, isLoading }: Props) {
  const copy = (r: Recommendation) => {
    navigator.clipboard.writeText(`${r.title}\n${r.description}`);
    toast({ title: 'Recomendación copiada' });
  };

  return (
    <Card className="border-border/50 bg-background/60 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-primary" />
        <h3 className="text-base font-semibold">Recomendaciones estratégicas</h3>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : !data || data.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Sparkles className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Todo en orden. Sin recomendaciones nuevas.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {data
            .slice()
            .sort((a, b) => a.priority - b.priority)
            .map((r) => (
              <li key={r.id} className="rounded-lg border border-border/50 bg-background/40 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{r.title}</div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{r.description}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className={cn('text-[10px]', TONE[r.impact])}>Impacto: {r.impact}</Badge>
                      <Badge variant="outline" className="text-[10px]">Dificultad: {r.difficulty}</Badge>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 w-7 shrink-0 p-0" onClick={() => copy(r)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
        </ul>
      )}
    </Card>
  );
}
