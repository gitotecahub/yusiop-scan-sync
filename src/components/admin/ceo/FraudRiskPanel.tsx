import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { FraudSummary, formatNumber } from '@/lib/ceoCenter';
import { Eye, Shield, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  data?: FraudSummary;
  isLoading: boolean;
}

export function FraudRiskPanel({ data, isLoading }: Props) {
  return (
    <Card className="border-border/50 bg-background/60 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold">Fraude y riesgos</h3>
        </div>
        <Button asChild variant="ghost" size="sm" className="h-7 gap-1 text-xs">
          <Link to="/admin/downloads">
            <Eye className="h-3 w-3" /> Ver auditoría
          </Link>
        </Button>
      </div>

      {isLoading || !data ? (
        <Skeleton className="h-32" />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Stat label="Descargas sospechosas" value={formatNumber(data.suspicious_downloads)} />
          <Stat label="IPs repetidas" value={formatNumber(data.repeated_ips)} />
          <Stat label="Usuarios marcados" value={formatNumber(data.flagged_users)} />
          <Stat label="Score medio" value={data.avg_fraud_score.toString()} />
          <Stat label="Alertas críticas" value={formatNumber(data.critical_alerts)} highlight={data.critical_alerts > 0} />
        </div>
      )}
    </Card>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? 'border-red-500/40 bg-red-500/5' : 'border-border/50 bg-background/40'}`}>
      <div className={`text-lg font-bold ${highlight ? 'text-red-400' : ''}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
