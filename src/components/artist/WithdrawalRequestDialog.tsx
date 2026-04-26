import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatXAFFixed } from '@/lib/currency';
import { toast } from 'sonner';
import { Loader2, AlertTriangle, Plus } from 'lucide-react';
import { FinancialSettings } from '@/hooks/useArtistWallet';
import AddPaymentMethodDialog from './AddPaymentMethodDialog';

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  artistId: string;
  availableXaf: number;
  settings: FinancialSettings | null;
  onSubmitted?: () => void;
};

type Method = {
  id: string;
  method_type: string;
  account_holder_name: string;
  payment_details: Record<string, string>;
};

const METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Transferencia bancaria',
  mobile_money: 'Mobile Money',
  paypal: 'PayPal',
  other: 'Otro',
};

const WithdrawalRequestDialog = ({ open, onOpenChange, artistId, availableXaf, settings, onSubmitted }: Props) => {
  const [methods, setMethods] = useState<Method[]>([]);
  const [methodId, setMethodId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const loadMethods = async () => {
    const { data } = await supabase
      .from('artist_withdrawal_methods')
      .select('id, method_type, account_holder_name, payment_details')
      .eq('artist_id', artistId);
    setMethods((data as Method[]) ?? []);
    if (data && data.length === 1) setMethodId(data[0].id);
  };

  useEffect(() => {
    if (open) {
      loadMethods();
      setAmount('');
      setConfirm(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, artistId]);

  const amountNum = Number(amount) || 0;
  const minXaf = settings?.withdrawal_minimum_xaf ?? 0;
  let feeXaf = 0;
  if (settings?.withdrawal_fee_type === 'fixed') feeXaf = Math.round(settings.withdrawal_fee_value);
  if (settings?.withdrawal_fee_type === 'percent') feeXaf = Math.round((amountNum * Number(settings.withdrawal_fee_value)) / 100);
  const netXaf = Math.max(0, amountNum - feeXaf);

  const canSubmit =
    !!methodId &&
    amountNum >= minXaf &&
    amountNum <= availableXaf &&
    confirm &&
    !submitting &&
    settings?.withdrawals_enabled !== false;

  const handleSubmit = async () => {
    setSubmitting(true);
    const { data, error } = await supabase.rpc('request_artist_withdrawal', {
      p_artist_id: artistId,
      p_amount_xaf: amountNum,
      p_method_id: methodId,
    });
    setSubmitting(false);
    if (error) {
      const msg = error.message || '';
      const map: Record<string, string> = {
        withdrawals_disabled: 'Los retiros están temporalmente desactivados.',
        amount_below_minimum: `La cantidad mínima es ${formatXAFFixed(minXaf)}.`,
        invalid_method: 'Método de pago inválido.',
        frequency_limit: `Solo puedes solicitar 1 retiro cada ${settings?.withdrawal_frequency_days} días.`,
        insufficient_balance: 'Balance disponible insuficiente.',
        earnings_under_review: 'Tienes ingresos bajo revisión. No puedes retirar ahora.',
        not_authorized: 'No autorizado.',
      };
      const friendly = Object.entries(map).find(([k]) => msg.includes(k))?.[1] || 'No se pudo enviar la solicitud.';
      toast.error(friendly);
      return;
    }
    if ((data as { success?: boolean })?.success) {
      toast.success('Solicitud enviada. Será revisada por YUSIOP.');
      onSubmitted?.();
      onOpenChange(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Solicitar retiro</DialogTitle>
            <DialogDescription>
              Esta solicitud será revisada por el equipo financiero de YUSIOP.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Card className="p-3 bg-muted/40">
              <div className="text-xs text-muted-foreground">Balance disponible</div>
              <div className="text-2xl font-bold">{formatXAFFixed(availableXaf)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Mínimo de retiro: {formatXAFFixed(minXaf)}
              </div>
            </Card>

            <div>
              <Label>Cantidad a retirar (XAF)</Label>
              <Input
                type="number"
                min={minXaf}
                max={availableXaf}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={String(minXaf)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Método de pago</Label>
                <Button variant="ghost" size="sm" onClick={() => setAddOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Añadir método
                </Button>
              </div>
              {methods.length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Añade un método de pago antes de solicitar tu primer retiro.
                  </AlertDescription>
                </Alert>
              ) : (
                <Select value={methodId} onValueChange={setMethodId}>
                  <SelectTrigger><SelectValue placeholder="Selecciona método" /></SelectTrigger>
                  <SelectContent>
                    {methods.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {METHOD_LABELS[m.method_type]} — {m.account_holder_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {amountNum > 0 && (
              <Card className="p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span>Solicitado</span><span>{formatXAFFixed(amountNum)}</span></div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Comisión ({settings?.withdrawal_fee_type === 'percent' ? `${settings.withdrawal_fee_value}%` : settings?.withdrawal_fee_type === 'fixed' ? 'fija' : '0'})</span>
                  <span>-{formatXAFFixed(feeXaf)}</span>
                </div>
                <div className="flex justify-between font-semibold pt-1 border-t">
                  <span>Recibirás</span><span className="text-primary">{formatXAFFixed(netXaf)}</span>
                </div>
                <div className="text-xs text-muted-foreground pt-1">Procesamiento: 3-7 días hábiles tras aprobación.</div>
              </Card>
            )}

            <label className="flex items-start gap-2 text-xs">
              <Checkbox checked={confirm} onCheckedChange={(v) => setConfirm(v === true)} />
              <span>Confirmo que los datos de pago son correctos y entiendo que esta solicitud será revisada por YUSIOP.</span>
            </label>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={!canSubmit}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Enviar solicitud
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AddPaymentMethodDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        artistId={artistId}
        onCreated={() => {
          setAddOpen(false);
          loadMethods();
        }}
      />
    </>
  );
};

export default WithdrawalRequestDialog;
