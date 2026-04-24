import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ShieldAlert, ShieldX, Loader2, ShieldQuestion } from 'lucide-react';

export type CopyrightStatus =
  | 'pending'
  | 'analyzing'
  | 'clean'
  | 'review'
  | 'blocked'
  | 'error';

interface Props {
  status: CopyrightStatus;
  score?: number | null;
  className?: string;
}

const CopyrightBadge = ({ status, score, className }: Props) => {
  switch (status) {
    case 'analyzing':
      return (
        <Badge variant="secondary" className={className}>
          <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Analizando copyright…
        </Badge>
      );
    case 'clean':
      return (
        <Badge variant="secondary" className={`border border-emerald-500/40 text-emerald-700 dark:text-emerald-400 ${className ?? ''}`}>
          <ShieldCheck className="h-3 w-3 mr-1" /> Sin copyright detectado
        </Badge>
      );
    case 'review':
      return (
        <Badge variant="secondary" className={`border border-amber-500/40 text-amber-700 dark:text-amber-400 ${className ?? ''}`}>
          <ShieldAlert className="h-3 w-3 mr-1" /> Posible coincidencia ({score ?? 0}%)
        </Badge>
      );
    case 'blocked':
      return (
        <Badge variant="destructive" className={className}>
          <ShieldX className="h-3 w-3 mr-1" /> Copyright detectado ({score ?? 0}%)
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="outline" className={className}>
          <ShieldQuestion className="h-3 w-3 mr-1" /> Análisis fallido
        </Badge>
      );
    case 'pending':
    default:
      return (
        <Badge variant="outline" className={className}>
          <ShieldQuestion className="h-3 w-3 mr-1" /> Análisis pendiente
        </Badge>
      );
  }
};

export default CopyrightBadge;
