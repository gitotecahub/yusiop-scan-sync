import { Zap, Sparkles, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMySubscription } from '@/hooks/useSubscriptionPlans';

type Size = 'sm' | 'md' | 'lg';

interface Props {
  size?: Size;
  className?: string;
  withTooltip?: boolean;
}

const PLAN_META = {
  plus: {
    label: 'Plus',
    Icon: Zap,
    gradient: 'from-[hsl(220_85%_45%)] to-[hsl(188_85%_50%)]',
    ring: 'ring-[hsl(220_85%_45%/0.4)]',
  },
  pro: {
    label: 'Pro',
    Icon: Sparkles,
    gradient: 'from-[hsl(250_95%_55%)] via-[hsl(265_90%_55%)] to-[hsl(188_85%_50%)]',
    ring: 'ring-[hsl(265_90%_55%/0.45)]',
  },
  elite: {
    label: 'Elite',
    Icon: Crown,
    gradient: 'from-[hsl(280_85%_55%)] via-[hsl(45_95%_55%)] to-[hsl(188_85%_50%)]',
    ring: 'ring-[hsl(45_95%_55%/0.5)]',
  },
} as const;

const SIZE_MAP: Record<Size, { box: string; icon: string }> = {
  sm: { box: 'h-5 w-5', icon: 'h-3 w-3' },
  md: { box: 'h-6 w-6', icon: 'h-3.5 w-3.5' },
  lg: { box: 'h-7 w-7', icon: 'h-4 w-4' },
};

export const SubscriptionLevelBadge = ({ size = 'md', className, withTooltip = true }: Props) => {
  const { subscription, loading } = useMySubscription();
  if (loading || !subscription?.plan) return null;
  const code = subscription.plan.code as keyof typeof PLAN_META;
  const meta = PLAN_META[code];
  if (!meta) return null;
  const { Icon } = meta;
  const s = SIZE_MAP[size];

  return (
    <span
      title={withTooltip ? `Plan ${meta.label}` : undefined}
      aria-label={`Plan ${meta.label}`}
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-gradient-to-br text-white shadow-md ring-2',
        meta.gradient,
        meta.ring,
        s.box,
        className,
      )}
    >
      <Icon className={cn(s.icon)} strokeWidth={2.5} />
    </span>
  );
};

export default SubscriptionLevelBadge;
