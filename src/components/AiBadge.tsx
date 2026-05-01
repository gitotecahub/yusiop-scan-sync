import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AiUsageType = 'none' | 'assisted' | 'ai_voice' | 'ai_generated';

export const AI_TYPE_OPTIONS: { value: AiUsageType; label: string; description: string }[] = [
  { value: 'none', label: 'No se ha utilizado IA', description: 'Producción 100% humana' },
  { value: 'assisted', label: 'IA como apoyo creativo', description: 'Mezcla, masterización o ideas con IA' },
  { value: 'ai_voice', label: 'Voz generada o modificada con IA', description: 'Voz sintética o clonada' },
  { value: 'ai_generated', label: 'Canción generada principalmente con IA', description: 'Composición/instrumentación generada por IA' },
];

const SHORT_LABEL: Record<AiUsageType, string> = {
  none: '',
  assisted: 'Creación asistida por IA',
  ai_voice: 'Voz con IA',
  ai_generated: 'Contenido generado con IA',
};

interface AiBadgeProps {
  aiType: AiUsageType | null | undefined;
  size?: 'xs' | 'sm';
  className?: string;
}

const AiBadge = ({ aiType, size = 'sm', className }: AiBadgeProps) => {
  if (!aiType || aiType === 'none') return null;
  const label = SHORT_LABEL[aiType];
  const isHeavy = aiType === 'ai_generated' || aiType === 'ai_voice';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium tracking-wide whitespace-nowrap',
        size === 'xs' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]',
        isHeavy
          ? 'border-primary/40 bg-primary/15 text-primary'
          : 'border-border bg-muted/60 text-muted-foreground',
        className,
      )}
      title={label}
    >
      <Sparkles className={size === 'xs' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
      {label}
    </span>
  );
};

export default AiBadge;
