import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SalesForecast, formatCurrency } from '@/lib/ceoCenter';
import { LineChart, TrendingUp } from 'lucide-react';

interface Props {
  data?: SalesForecast;
  isLoading: boolean;
}

export function SalesForecastCard({ data, isLoading }: Props) {
  return (
    <Card className="border-border/50 bg-background/60 p-5">
      <div className="mb-4 flex items-center gap-2">
        <LineChart className="h-4 w-4 text-primary" />
        <h3 className="text-base font-semibold">Proyección de ventas</h3>
      </div>

      {isLoading || !data ? (
        <Skeleton className="h-40" />
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Media diaria: <span className="font-medium text-foreground">{formatCurrency(data.daily_avg)}</span>
          </p>
          {(['forecast_7', 'forecast_30', 'forecast_90'] as const).map((k) => {
            const label = k === 'forecast_7' ? '7 días' : k === 'forecast_30' ? '30 días' : '90 días';
            const f = data[k];
            return (
              <div key={k} className="rounded-lg border border-border/50 bg-background/40 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">Próximos {label}</span>
                  <TrendingUp className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Bucket label="Conservador" value={f.conservative} tone="muted" />
                  <Bucket label="Realista" value={f.realistic} tone="primary" />
                  <Bucket label="Optimista" value={f.optimistic} tone="emerald" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function Bucket({ label, value, tone }: { label: string; value: number; tone: 'muted' | 'primary' | 'emerald' }) {
  const cls = tone === 'primary' ? 'text-primary' : tone === 'emerald' ? 'text-emerald-400' : 'text-muted-foreground';
  return (
    <div>
      <div className={`text-sm font-bold ${cls}`}>{formatCurrency(value)}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
