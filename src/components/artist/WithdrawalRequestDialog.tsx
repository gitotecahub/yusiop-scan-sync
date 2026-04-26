import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatXAFFixed } from '@/lib/currency';
import { toast } from 'sonner';
import { Loader2, AlertTriangle, Plus, Banknote } from 'lucide-react';
import { FinancialSettings } from '@/hooks/useArtistWallet';
import AddPaymentMethodDialog from './AddPaymentMethodDialog';
import {
  WithdrawalMethod,
  METHOD_LABELS,
  WITHDRAWAL_ERROR_MAP,
  formatMethodSummary,
} from '@/lib/withdrawalMethods';

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  artistId: string;
  availableXaf: number;
  settings: FinancialSettings | null;
  onSubmitted?: () => void;
};

const WithdrawalRequestDialog = ({ open, onOpenChange, artistId, availableXaf, settings, onSubmitted }: Props) => {
  const [methods, setMethods] = useState<WithdrawalMethod[]>([]);
  const [methodId, setMethodId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [loadingMethods, setLoadingMethods] = useState(false);

  const loadMethods = async () => {
    setLoadingMethods(true);
    const { data } = await supabase
      .from('artist_withdrawal_methods')
      .select('id, artist_id, user_id, method_type, account_holder_name, country, details_json, payment_details, is_default, verification_status, rejection_reason, last_used_at, created_at, updated_at')
      .eq('artist_id', artistId);
    setLoadingMethods(false);
    const all = (data as WithdrawalMethod[]) ?? [];
    setMethods(all);
    const verified = all.filter((m) => m.verification_status === 'verified');
    if (verified.length === 1) setMethodId(verified[0].id);
    else if (verified.length > 0) {
      const def = verified.find((m) => m.is_default);
      if (def) setMethodId(def.id);
    }
  };

  useEffect(() => {
    if (open) {
      loadMethods();
      setAmount('');
      setConfirm(false);
      setMethodId('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, artistId]);

  const verifiedMethods = methods.filter((m) => m.verification_status === 'verified');
  const selectedMethod = methods.find((m) => m.id === methodId);
  const isCrypto = selectedMethod?.method_type === 'crypto';

  const amountNum = Number(amount) || 0;
  const minXaf = settings?.withdrawal_minimum_xaf ?? 0;
  let feeXaf = 0;
  if (settings?.withdrawal_fee_type === 'fixed') feeXaf = Math.round(settings.withdrawal_fee_value);
  if (settings?.withdrawal_fee_type === 'percent') feeXaf = Math.round((amountNum * Number(settings.withdrawal_fee_value)) / 100);
  const netXaf = Math.max(0, amountNum - feeXaf);

  const canSubmit =
    !!methodId &&
    selectedMethod?.verification_status === 'verified' &&
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
      const friendly = Object.entries(WITHDRAWAL_ERROR_MAP).find(([k]) => msg.includes(k))?.[1] || 'No se pudo enviar la solicitud.';
      toast.error(friendly);
      return;
    }
    if ((data as { success?: boolean })?.success) {
      toast.success('Solicitud enviada. Será revisada por el equipo financiero de YUSIOP.');
      onSubmitted?.();
      onOpenChange(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Solicitar retiro</DialogTitle>
            <DialogDescription>
              YUSIOP revisará tu solicitud antes de procesar el pago manualmente.
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
                <Label>Método de cobro</Label>
                <Button variant="ghost" size="sm" onClick={() => setAddOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Añadir método
                </Button>
              </div>

              {loadingMethods ? (
                <p className="text-xs text-muted-foreground">Cargando…</p>
              ) : verifiedMethods.length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Sin métodos verificados</AlertTitle>
                  <AlertDescription>
                    Debes añadir y verificar un método de cobro antes de solicitar un retiro.
                    {methods.length > 0 && ' Tienes métodos pendientes de revisión por YUSIOP.'}
                  </AlertDescription>
                </Alert>
              ) : (
                <Select value={methodId} onValueChange={setMethodId}>
                  <SelectTrigger><SelectValue placeholder="Selecciona método" /></SelectTrigger>
                  <SelectContent>
                    {verifiedMethods.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {METHOD_LABELS[m.method_type]} · {formatMethodSummary(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {isCrypto && (
              <Alert className="border-amber-500/40 bg-amber-500/5">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertTitle>Retiro en crypto</AlertTitle>
                <AlertDescription>
                  Los pagos en crypto son <strong>irreversibles</strong>. Verifica cuidadosamente que la red
                  ({selectedMethod?.details_json?.network}) y la wallet seleccionadas son correctas.
                </AlertDescription>
              </Alert>
            )}

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
                {selectedMethod && (
                  <div className="flex justify-between text-xs text-muted-foreground pt-1">
                    <span>Método</span>
                    <span>{METHOD_LABELS[selectedMethod.method_type]}</span>
                  </div>
                )}
                <div className="text-xs text-muted-foreground pt-1">Tiempo estimado: 3-7 días hábiles tras aprobación.</div>
              </Card>
            )}

            <label className="flex items-start gap-2 text-xs">
              <Checkbox checked={confirm} onCheckedChange={(v) => setConfirm(v === true)} />
              <span>
                Confirmo que los datos del método de cobro son correctos. Esta solicitud será revisada por
                el equipo financiero de YUSIOP y pagada manualmente.
              </span>
            </label>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={!canSubmit}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Banknote className="h-4 w-4 mr-2" />
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
        onSaved={() => loadMethods()}
      />
    </>
  );
};

export default WithdrawalRequestDialog;
