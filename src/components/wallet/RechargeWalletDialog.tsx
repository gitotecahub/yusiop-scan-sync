import { useState } from 'react';
import { Loader2, Sparkles, Zap, Crown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface RechargeWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Pack = {
  amount_eur: 5 | 10 | 20;
  downloads: number;
  bonus: number;
  highlight?: boolean;
  icon: typeof Sparkles;
  label: string;
};

const PACKS: Pack[] = [
  { amount_eur: 5, downloads: 5, bonus: 1, icon: Sparkles, label: 'Inicial' },
  { amount_eur: 10, downloads: 10, bonus: 2, highlight: true, icon: Zap, label: 'Más popular' },
  { amount_eur: 20, downloads: 20, bonus: 5, icon: Crown, label: 'Mejor valor' },
];

export default function RechargeWalletDialog({ open, onOpenChange }: RechargeWalletDialogProps) {
  const [loadingAmount, setLoadingAmount] = useState<number | null>(null);

  const handleRecharge = async (amount: 5 | 10 | 20) => {
    setLoadingAmount(amount);
    try {
      const { data, error } = await supabase.functions.invoke('create-wallet-recharge', {
        body: { amount_eur: amount },
      });
      if (error) throw error;
      const url = (data as { url?: string })?.url;
      if (!url) throw new Error('No se recibió URL de pago');
      // Abrir Stripe Checkout en la misma pestaña
      window.location.href = url;
    } catch (e: any) {
      console.error('Recharge error', e);
      toast({
        title: 'Error al iniciar la recarga',
        description: e?.message ?? 'Inténtalo de nuevo',
        variant: 'destructive',
      });
      setLoadingAmount(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loadingAmount) onOpenChange(v); }}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle>Recargar saldo</DialogTitle>
          <DialogDescription>
            Elige un pack. Pago seguro con tarjeta vía Stripe.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5 mt-2">
          {PACKS.map((pack) => {
            const Icon = pack.icon;
            const isLoading = loadingAmount === pack.amount_eur;
            const total = pack.downloads + pack.bonus;
            return (
              <button
                key={pack.amount_eur}
                onClick={() => handleRecharge(pack.amount_eur)}
                disabled={loadingAmount !== null}
                className={cn(
                  'w-full text-left p-3.5 rounded-xl border transition-all active:scale-[0.99]',
                  pack.highlight
                    ? 'border-primary bg-primary/5 shadow-glow'
                    : 'border-border bg-card hover:border-primary/40',
                  loadingAmount !== null && !isLoading && 'opacity-50',
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'h-10 w-10 rounded-lg flex items-center justify-center shrink-0',
                    pack.highlight ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
                  )}>
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{pack.amount_eur} €</span>
                      {pack.highlight && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                          {pack.label}
                        </span>
                      )}
                      {!pack.highlight && (
                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          {pack.label}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {pack.downloads} descargas <span className="text-primary font-medium">+ {pack.bonus} bonus</span>
                      <span className="ml-1.5 text-foreground/70">= {total} en total</span>
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-[11px] text-muted-foreground text-center mt-2">
          Suscriptores Elite reciben +10 % extra en cada recarga.
        </p>
      </DialogContent>
    </Dialog>
  );
}
