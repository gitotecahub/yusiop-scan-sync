import { CeoPeriod, periodLabel } from '@/lib/ceoCenter';
import { cn } from '@/lib/utils';

interface Props {
  value: CeoPeriod;
  onChange: (v: CeoPeriod) => void;
}

const PERIODS: CeoPeriod[] = ['1d', '7d', '30d', '90d', '1y'];

export function CeoPeriodSelector({ value, onChange }: Props) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-background/40 p-1 backdrop-blur">
      {PERIODS.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={cn(
            'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
            value === p
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {periodLabel(p)}
        </button>
      ))}
    </div>
  );
}
