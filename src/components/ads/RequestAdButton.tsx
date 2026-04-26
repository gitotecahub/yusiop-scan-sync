import { useState } from 'react';
import { Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RequestAdDialog from './RequestAdDialog';
import { cn } from '@/lib/utils';

interface Props {
  variant?: 'inline' | 'card';
  className?: string;
}

const RequestAdButton = ({ variant = 'inline', className }: Props) => {
  const [open, setOpen] = useState(false);

  if (variant === 'card') {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className={cn(
            'w-full text-left rounded-2xl border border-primary/30 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/60 group',
            className,
          )}
          style={{
            background:
              'linear-gradient(135deg, hsl(250 95% 20% / 0.6), hsl(188 85% 25% / 0.4))',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <Megaphone className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-white text-sm">¿Quieres anunciarte?</p>
              <p className="text-xs text-white/70 line-clamp-1">
                Llega a miles de oyentes en YUSIOP
              </p>
            </div>
            <span className="text-xs font-bold text-white/90 group-hover:text-white">→</span>
          </div>
        </button>
        <RequestAdDialog open={open} onOpenChange={setOpen} />
      </>
    );
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className={className}>
        <Megaphone className="h-4 w-4 mr-2" />
        Quiero publicidad
      </Button>
      <RequestAdDialog open={open} onOpenChange={setOpen} />
    </>
  );
};

export default RequestAdButton;
