import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, Plus, Ticket, Wallet as WalletIcon, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useWallet, type WalletTransaction } from '@/hooks/useWallet';
import { formatXAFFixed } from '@/lib/currency';
import { formatPriceFromXaf } from '@/lib/localizedPricing';
import { useLocaleStore } from '@/stores/localeStore';
import RedeemCodeDialog from '@/components/wallet/RedeemCodeDialog';
import RechargeWalletDialog from '@/components/wallet/RechargeWalletDialog';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const txMeta = (tx: WalletTransaction) => {
  switch (tx.type) {
    case 'recharge':
      return { label: 'Recarga', icon: ArrowDownLeft, color: 'text-green-500', bg: 'bg-green-500/10', sign: '+' };
    case 'purchase':
      return { label: 'Descarga', icon: ArrowUpRight, color: 'text-rose-400', bg: 'bg-rose-500/10', sign: '' };
    case 'refund':
      return { label: 'Reembolso', icon: ArrowDownLeft, color: 'text-blue-400', bg: 'bg-blue-500/10', sign: '+' };
    case 'bonus':
      return { label: 'Bonus', icon: Sparkles, color: 'text-amber-400', bg: 'bg-amber-500/10', sign: '+' };
    default:
      return { label: 'Ajuste', icon: RefreshCw, color: 'text-muted-foreground', bg: 'bg-muted', sign: '' };
  }
};

const Wallet = () => {
  const navigate = useNavigate();
  const { wallet, transactions, loading, refresh } = useWallet();
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Manejar el retorno de Stripe Checkout
  useEffect(() => {
    const status = searchParams.get('status');
    if (status === 'success') {
      toast({
        title: '¡Recarga completada!',
        description: 'Tu saldo se ha actualizado.',
      });
      // Refrescar varias veces porque el webhook puede tardar unos segundos
      refresh();
      const t1 = setTimeout(() => refresh(), 2000);
      const t2 = setTimeout(() => refresh(), 5000);
      searchParams.delete('status');
      searchParams.delete('session_id');
      setSearchParams(searchParams, { replace: true });
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    if (status === 'cancelled') {
      toast({
        title: 'Recarga cancelada',
        description: 'No se ha realizado ningún cargo.',
        variant: 'destructive',
      });
      searchParams.delete('status');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, refresh]);

  const balance = wallet?.balance ?? 0;

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-background/70 border-b border-border/40">
        <div className="flex items-center justify-between px-4 py-3 max-w-md mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-base font-semibold tracking-tight">Mi Saldo</h1>
          <Button variant="ghost" size="icon" onClick={refresh} className="rounded-full" disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-5">
        {/* Tarjeta de saldo estilo neobank */}
        <div className="relative overflow-hidden rounded-3xl p-6 shadow-xl"
          style={{
            background: 'linear-gradient(135deg, hsl(258 90% 56%) 0%, hsl(220 90% 56%) 50%, hsl(180 80% 45%) 100%)',
          }}
        >
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-white/10 blur-2xl" />

          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-white/80 text-xs uppercase tracking-widest">
                <WalletIcon className="h-4 w-4" />
                YUSIOP Wallet
              </div>
              <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-white/15 text-white/90">
                {wallet?.currency ?? 'XAF'}
              </span>
            </div>

            <div className="text-white/70 text-xs mb-1">Saldo disponible</div>
            {loading && !wallet ? (
              <Skeleton className="h-10 w-44 bg-white/20" />
            ) : (
              <div className="text-4xl font-bold text-white tracking-tight tabular-nums animate-in fade-in slide-in-from-bottom-1 duration-500">
                {formatXAFFixed(balance)}
              </div>
            )}

            <div className="mt-6 flex items-center justify-between text-[11px] text-white/75">
              <div>
                <div className="text-white/55 uppercase tracking-wider">Recargado</div>
                <div className="font-medium text-white">{formatXAFFixed(wallet?.total_recharged ?? 0)}</div>
              </div>
              <div className="text-right">
                <div className="text-white/55 uppercase tracking-wider">Gastado</div>
                <div className="font-medium text-white">{formatXAFFixed(wallet?.total_spent ?? 0)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => setRedeemOpen(true)}
            className="h-auto py-4 flex-col gap-1.5 rounded-2xl"
            variant="secondary"
          >
            <Ticket className="h-5 w-5" />
            <span className="text-xs font-medium">Introducir código</span>
            <span className="text-[10px] text-muted-foreground">Tarjeta física</span>
          </Button>
          <Button
            onClick={() => setRechargeOpen(true)}
            className="h-auto py-4 flex-col gap-1.5 rounded-2xl"
          >
            <Plus className="h-5 w-5" />
            <span className="text-xs font-medium">Recargar saldo</span>
            <span className="text-[10px] opacity-80">Pago digital</span>
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground text-center px-4 -mt-1">
          Tu saldo se descuenta automáticamente al descargar canciones ({formatXAFFixed(wallet?.value_per_download_xaf ?? 650)} por descarga).
        </p>

        {/* Historial */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-foreground">Movimientos</h2>
            <span className="text-[11px] text-muted-foreground">{transactions.length}</span>
          </div>

          {loading && transactions.length === 0 ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
            </div>
          ) : transactions.length === 0 ? (
            <Card className="p-8 text-center rounded-2xl border-dashed">
              <WalletIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Aún no hay movimientos</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Canjea un código para añadir saldo
              </p>
            </Card>
          ) : (
            <div className="space-y-1.5">
              {transactions.map((tx) => {
                const meta = txMeta(tx);
                const Icon = meta.icon;
                const displayAmount = Math.abs(tx.amount);
                return (
                  <div
                    key={tx.id}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-card/60 border border-border/40 hover:border-border transition-colors"
                  >
                    <div className={cn('h-10 w-10 rounded-full flex items-center justify-center shrink-0', meta.bg)}>
                      <Icon className={cn('h-4 w-4', meta.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{tx.description ?? meta.label}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {meta.label} · {formatDate(tx.created_at)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={cn('text-sm font-semibold tabular-nums', meta.color)}>
                        {meta.sign}{formatXAFFixed(displayAmount)}
                      </div>
                      <div className="text-[10px] text-muted-foreground tabular-nums">
                        {formatXAFFixed(tx.balance_after)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <RedeemCodeDialog open={redeemOpen} onOpenChange={setRedeemOpen} />
      <RechargeWalletDialog open={rechargeOpen} onOpenChange={setRechargeOpen} />
    </div>
  );
};

export default Wallet;
