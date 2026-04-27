import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Ticket, CheckCircle2 } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { toast } from 'sonner';
import { formatXAFFixed } from '@/lib/currency';

interface RedeemCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ERROR_MESSAGES: Record<string, string> = {
  invalid_code: 'Este código no es válido.',
  card_used: 'Este código ya ha sido utilizado.',
  card_expired: 'Este código ha caducado.',
  card_disabled: 'Este código ha sido desactivado.',
  unauthenticated: 'Debes iniciar sesión.',
};

export const RedeemCodeDialog = ({ open, onOpenChange }: RedeemCodeDialogProps) => {
  const { redeemCode } = useWallet();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ amount: number; balance: number } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    const res = await redeemCode(code.trim());
    setLoading(false);
    if (res.success) {
      setSuccess({ amount: res.amount ?? 0, balance: res.new_balance ?? 0 });
      toast.success(`+${formatXAFFixed(res.amount ?? 0)} añadidos a tu saldo`);
    } else {
      toast.error(ERROR_MESSAGES[res.error ?? ''] ?? 'No se pudo canjear el código');
    }
  };

  const handleClose = (next: boolean) => {
    if (!next) {
      setCode('');
      setSuccess(null);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20">
            <Ticket className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-center">Introducir código</DialogTitle>
          <DialogDescription className="text-center">
            Introduce el código de tu tarjeta recargable para añadir saldo a tu wallet.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
              <CheckCircle2 className="h-9 w-9 text-primary" />
            </div>
            <p className="text-2xl font-bold">+{formatXAFFixed(success.amount)}</p>
            <p className="text-sm text-muted-foreground">
              Saldo actual: <span className="font-medium text-foreground">{formatXAFFixed(success.balance)}</span>
            </p>
            <Button onClick={() => handleClose(false)} className="mt-2 w-full">Listo</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recharge-code">Código de recarga</Label>
              <Input
                id="recharge-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="WAL-XXXXXXXX"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                className="text-center font-mono tracking-widest text-lg"
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !code.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Canjear código'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RedeemCodeDialog;
