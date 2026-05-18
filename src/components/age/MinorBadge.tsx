import { Shield, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Props {
  ageGroup: 'child' | 'teen' | 'adult' | null;
  parentalVerified?: boolean;
  className?: string;
}

const MinorBadge = ({ ageGroup, parentalVerified, className }: Props) => {
  if (!ageGroup || ageGroup === 'adult') return null;
  const Icon = parentalVerified ? ShieldCheck : Shield;
  const label = ageGroup === 'child'
    ? (parentalVerified ? 'Cuenta menor (tutor verificado)' : 'Cuenta menor · pendiente tutor')
    : (parentalVerified ? 'Cuenta menor · tutor verificado' : 'Cuenta menor de edad');
  return (
    <Badge variant="secondary" className={`gap-1 ${className ?? ''}`}>
      <Icon className="h-3 w-3" />
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </Badge>
  );
};

export default MinorBadge;
