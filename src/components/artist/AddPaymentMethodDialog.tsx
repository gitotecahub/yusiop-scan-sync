import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Loader2, AlertTriangle, Banknote, Smartphone, Wallet, Coins, FileText, Upload } from 'lucide-react';
import type { MethodType, WithdrawalMethod, CryptoStablecoin, CryptoNetwork } from '@/lib/withdrawalMethods';

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  artistId: string;
  editing?: WithdrawalMethod | null;
  onSaved?: () => void;
};

const METHOD_OPTIONS: { value: MethodType; label: string; icon: typeof Banknote }[] = [
  { value: 'bank_transfer', label: 'Transferencia bancaria', icon: Banknote },
  { value: 'mobile_money', label: 'Mobile Money', icon: Smartphone },
  { value: 'paypal', label: 'PayPal', icon: Wallet },
  { value: 'crypto', label: 'Crypto / Stablecoins', icon: Coins },
  { value: 'manual_other', label: 'Otro método manual', icon: FileText },
];

const STABLECOINS: CryptoStablecoin[] = ['USDT', 'USDC'];
const NETWORKS: CryptoNetwork[] = ['TRC20', 'BEP20', 'ERC20', 'Polygon'];

const AddPaymentMethodDialog = ({ open, onOpenChange, artistId, editing, onSaved }: Props) => {
  const { user } = useAuthStore();

  const [methodType, setMethodType] = useState<MethodType>('mobile_money');
  const [holder, setHolder] = useState('');
  const [country, setCountry] = useState('');
  const [note, setNote] = useState('');

  // bank
  const [bankName, setBankName] = useState('');
  const [iban, setIban] = useState('');
  const [swift, setSwift] = useState('');

  // mobile money
  const [operator, setOperator] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // paypal
  const [paypalEmail, setPaypalEmail] = useState('');

  // crypto
  const [stablecoin, setStablecoin] = useState<CryptoStablecoin>('USDT');
  const [network, setNetwork] = useState<CryptoNetwork>('TRC20');
  const [wallet, setWallet] = useState('');
  const [walletConfirm, setWalletConfirm] = useState('');
  const [cryptoConfirm, setCryptoConfirm] = useState(false);

  // manual other
  const [methodName, setMethodName] = useState('');
  const [methodDetails, setMethodDetails] = useState('');

  // KYC document (optional for bank/mobile/paypal)
  const [kycFile, setKycFile] = useState<File | null>(null);
  const [kycUploading, setKycUploading] = useState(false);

  const [saving, setSaving] = useState(false);

  const reset = () => {
    setMethodType('mobile_money');
    setHolder(''); setCountry(''); setNote('');
    setBankName(''); setIban(''); setSwift('');
    setOperator(''); setPhoneNumber('');
    setPaypalEmail('');
    setStablecoin('USDT'); setNetwork('TRC20'); setWallet(''); setWalletConfirm(''); setCryptoConfirm(false);
    setMethodName(''); setMethodDetails('');
    setKycFile(null);
  };

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setMethodType(editing.method_type);
      setHolder(editing.account_holder_name);
      setCountry(editing.country ?? '');
      const d = editing.details_json ?? {};
      setNote(d.note ?? '');
      setBankName(d.bank_name ?? ''); setIban(d.iban ?? ''); setSwift(d.swift ?? '');
      setOperator(d.operator ?? ''); setPhoneNumber(d.phone_number ?? '');
      setPaypalEmail(d.email ?? '');
      setStablecoin((d.stablecoin as CryptoStablecoin) ?? 'USDT');
      setNetwork((d.network as CryptoNetwork) ?? 'TRC20');
      setWallet(d.wallet_address ?? '');
      setWalletConfirm(d.wallet_address ?? '');
      setMethodName(d.method_name ?? '');
      setMethodDetails(d.details ?? '');
    } else {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  const validate = (): string | null => {
    if (!holder.trim()) return 'El nombre del titular es obligatorio.';
    if (!country.trim()) return 'El país es obligatorio.';

    if (methodType === 'bank_transfer') {
      if (!bankName.trim()) return 'Indica el nombre del banco.';
      if (!iban.trim()) return 'Indica el IBAN o número de cuenta.';
    }
    if (methodType === 'mobile_money') {
      if (!operator.trim()) return 'Indica el operador.';
      if (!phoneNumber.trim()) return 'Indica el número de teléfono.';
    }
    if (methodType === 'paypal') {
      if (!paypalEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paypalEmail)) return 'Email de PayPal inválido.';
    }
    if (methodType === 'crypto') {
      if (!wallet.trim()) return 'Indica la dirección wallet.';
      if (wallet.trim() !== walletConfirm.trim()) return 'Las direcciones wallet no coinciden.';
      if (!cryptoConfirm) return 'Debes confirmar la advertencia sobre la dirección crypto.';
    }
    if (methodType === 'manual_other') {
      if (!methodName.trim()) return 'Indica el nombre del método.';
      if (!methodDetails.trim()) return 'Indica los detalles del método.';
    }
    return null;
  };

  const uploadKycIfNeeded = async (): Promise<string | null> => {
    if (!kycFile || !user) return null;
    setKycUploading(true);
    const ext = kycFile.name.split('.').pop() ?? 'pdf';
    const path = `${user.id}/${artistId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('artist-kyc').upload(path, kycFile, { upsert: false });
    setKycUploading(false);
    if (error) {
      toast.error(`Error al subir documento: ${error.message}`);
      return null;
    }
    return path;
  };

  const buildDetails = async (): Promise<Record<string, string> | null> => {
    const d: Record<string, string> = {};
    if (note.trim()) d.note = note.trim();

    if (methodType !== 'crypto' && methodType !== 'manual_other') {
      const kycPath = await uploadKycIfNeeded();
      if (kycPath) d.id_document_path = kycPath;
    }

    switch (methodType) {
      case 'bank_transfer':
        d.bank_name = bankName.trim();
        d.iban = iban.trim();
        if (swift.trim()) d.swift = swift.trim();
        break;
      case 'mobile_money':
        d.operator = operator.trim();
        d.phone_number = phoneNumber.trim();
        break;
      case 'paypal':
        d.email = paypalEmail.trim();
        break;
      case 'crypto':
        d.stablecoin = stablecoin;
        d.network = network;
        d.wallet_address = wallet.trim();
        break;
      case 'manual_other':
        d.method_name = methodName.trim();
        d.details = methodDetails.trim();
        break;
    }
    return d;
  };

  const handleSave = async () => {
    if (!user) return;
    const err = validate();
    if (err) { toast.error(err); return; }

    setSaving(true);
    const details = await buildDetails();
    if (!details) { setSaving(false); return; }

    if (editing) {
      // Editar: el RLS impide cambiar verification_status (no lo enviamos)
      const { error } = await supabase.from('artist_withdrawal_methods')
        .update({
          method_type: methodType,
          account_holder_name: holder.trim(),
          country: country.trim(),
          details_json: details,
          payment_details: details,
        })
        .eq('id', editing.id);
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      toast.success('Método actualizado. Volverá a estado pendiente de verificación si el admin lo requiere.');
    } else {
      const { error } = await supabase.from('artist_withdrawal_methods').insert({
        artist_id: artistId,
        user_id: user.id,
        method_type: methodType,
        account_holder_name: holder.trim(),
        country: country.trim(),
        details_json: details,
        payment_details: details,
      });
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      toast.success('Método de pago añadido. Está pendiente de verificación por YUSIOP.');
    }
    reset();
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar método de cobro' : 'Añadir método de cobro'}</DialogTitle>
          <DialogDescription>
            Tus métodos de cobro deben ser verificados por YUSIOP antes de poder usarse para solicitar un retiro.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Tipo de método</Label>
            <Select value={methodType} onValueChange={(v) => setMethodType(v as MethodType)} disabled={!!editing}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {METHOD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="inline-flex items-center gap-2">
                      <opt.icon className="h-4 w-4" /> {opt.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Nombre del titular *</Label>
              <Input value={holder} onChange={(e) => setHolder(e.target.value)} maxLength={120} />
            </div>
            <div>
              <Label>País *</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} maxLength={60} placeholder="Ej. Camerún" />
            </div>
          </div>

          {methodType === 'bank_transfer' && (
            <>
              <div>
                <Label>Nombre del banco *</Label>
                <Input value={bankName} onChange={(e) => setBankName(e.target.value)} maxLength={120} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>IBAN / número de cuenta *</Label>
                  <Input value={iban} onChange={(e) => setIban(e.target.value)} maxLength={60} />
                </div>
                <div>
                  <Label>SWIFT / BIC (opcional)</Label>
                  <Input value={swift} onChange={(e) => setSwift(e.target.value)} maxLength={20} />
                </div>
              </div>
            </>
          )}

          {methodType === 'mobile_money' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Operador *</Label>
                <Input value={operator} onChange={(e) => setOperator(e.target.value)} placeholder="MTN, Orange…" maxLength={60} />
              </div>
              <div>
                <Label>Número de teléfono *</Label>
                <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} maxLength={30} />
              </div>
            </div>
          )}

          {methodType === 'paypal' && (
            <div>
              <Label>Email de PayPal *</Label>
              <Input type="email" value={paypalEmail} onChange={(e) => setPaypalEmail(e.target.value)} maxLength={120} />
            </div>
          )}

          {methodType === 'crypto' && (
            <>
              <Alert className="border-amber-500/40 bg-amber-500/5">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertTitle>Atención</AlertTitle>
                <AlertDescription>
                  Los pagos en crypto son <strong>irreversibles</strong>. Asegúrate de que la red y la dirección son correctas.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Stablecoin *</Label>
                  <Select value={stablecoin} onValueChange={(v) => setStablecoin(v as CryptoStablecoin)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STABLECOINS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Red *</Label>
                  <Select value={network} onValueChange={(v) => setNetwork(v as CryptoNetwork)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {NETWORKS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Dirección wallet *</Label>
                <Input value={wallet} onChange={(e) => setWallet(e.target.value)} maxLength={200} className="font-mono text-xs" />
              </div>
              <div>
                <Label>Confirmar dirección wallet *</Label>
                <Input value={walletConfirm} onChange={(e) => setWalletConfirm(e.target.value)} maxLength={200} className="font-mono text-xs" />
                {wallet && walletConfirm && wallet !== walletConfirm && (
                  <p className="text-xs text-rose-500 mt-1">Las direcciones no coinciden.</p>
                )}
              </div>

              <label className="flex items-start gap-2 text-xs">
                <Checkbox checked={cryptoConfirm} onCheckedChange={(v) => setCryptoConfirm(v === true)} />
                <span>
                  Confirmo que la dirección wallet y la red seleccionada son correctas. Entiendo que un error
                  puede causar la <strong>pérdida permanente</strong> de los fondos.
                </span>
              </label>
            </>
          )}

          {methodType === 'manual_other' && (
            <>
              <div>
                <Label>Nombre del método *</Label>
                <Input value={methodName} onChange={(e) => setMethodName(e.target.value)} maxLength={80} placeholder="Ej. Western Union" />
              </div>
              <div>
                <Label>Detalles del método *</Label>
                <Input value={methodDetails} onChange={(e) => setMethodDetails(e.target.value)} maxLength={250} placeholder="Datos para realizar el pago" />
              </div>
            </>
          )}

          {(methodType === 'bank_transfer' || methodType === 'mobile_money' || methodType === 'paypal') && (
            <div>
              <Label className="flex items-center gap-2">
                <Upload className="h-4 w-4" /> Documento de identidad (opcional)
              </Label>
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setKycFile(e.target.files?.[0] ?? null)}
                disabled={kycUploading}
              />
              <p className="text-[10px] text-muted-foreground mt-1">PDF o imagen. Solo YUSIOP podrá ver este documento.</p>
            </div>
          )}

          <div>
            <Label>Notas / referencia (opcional)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={250} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || kycUploading}>
              {(saving || kycUploading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? 'Guardar cambios' : 'Añadir método'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddPaymentMethodDialog;
