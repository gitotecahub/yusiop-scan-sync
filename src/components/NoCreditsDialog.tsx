import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, CreditCard, ArrowRight } from 'lucide-react';
import { useSubscriptionVisibility } from '@/hooks/useSubscriptionVisibility';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modal mostrado cuando un usuario intenta descargar sin saldo.
 * Si suscripciones están visibles → ofrece ambas vías (suscribirse o comprar tarjeta).
 * Si no → solo ofrece comprar tarjeta.
 */
const NoCreditsDialog = ({ open, onOpenChange }: Props) => {
  const navigate = useNavigate();
  const { visible } = useSubscriptionVisibility();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Sin descargas disponibles
          </DialogTitle>
          <DialogDescription>
            Te has quedado sin descargas. Elige cómo continuar:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          {visible && (
            <button
              onClick={() => { onOpenChange(false); navigate('/subscriptions'); }}
              className="w-full text-left p-4 rounded-xl bg-gradient-to-br from-primary/15 via-purple-500/10 to-cyan-500/15 border border-primary/30 hover:border-primary/60 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">Suscríbete a YUSIOP Premium</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Desde 6 canciones/mes · 3.000 XAF
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          )}

          <button
            onClick={() => { onOpenChange(false); navigate('/store'); }}
            className="w-full text-left p-4 rounded-xl border border-border hover:border-primary/40 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <CreditCard className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Comprar tarjeta</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Descargas permanentes · Sin caducidad
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        </div>

        <Button variant="ghost" onClick={() => onOpenChange(false)} className="mt-2">
          Más tarde
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default NoCreditsDialog;
