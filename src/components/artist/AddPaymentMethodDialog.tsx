import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  artistId: string;
  onCreated?: () => void;
};

type MethodType = 'bank_transfer' | 'mobile_money' | 'paypal' | 'other';

const AddPaymentMethodDialog = ({ open, onOpenChange, artistId, onCreated }: Props) => {
  const { user } = useAuthStore();
  const [methodType, setMethodType] = useState<MethodType>('mobile_money');
  const [holder, setHolder] = useState('');
  const [country, setCountry] = useState('');
  const [account, setAccount] = useState('');
  const [extra, setExtra] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setMethodType('mobile_money');
    setHolder('');
    setCountry('');
    setAccount('');
    setExtra('');
  };

  const handleSave = async () => {
    if (!user || !holder.trim() || !account.trim()) {
      toast.error('Rellena los campos obligatorios.');
      return;
    }
    setSaving(true);
    const payment_details: Record<string, string> = { account };
    if (extra.trim()) payment_details.extra = extra.trim();

    const { error } = await supabase.from('artist_withdrawal_methods').insert({
      artist_id: artistId,
      user_id: user.id,
      method_type: methodType,
      account_holder_name: holder.trim(),
      country: country.trim() || null,
      payment_details,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message || 'No se pudo guardar el método');
      return;
    }
    toast.success('Método de pago añadido');
    reset();
    onCreated?.();
  };

  const accountLabel: Record<MethodType, string> = {
    bank_transfer: 'IBAN / Número de cuenta',
    mobile_money: 'Número de teléfono',
    paypal: 'Email de PayPal',
    other: 'Identificador de pago',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Añadir método de pago</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Tipo</Label>
            <Select value={methodType} onValueChange={(v) => setMethodType(v as MethodType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
                <SelectItem value="bank_transfer">Transferencia bancaria</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nombre del titular *</Label>
            <Input value={holder} onChange={(e) => setHolder(e.target.value)} maxLength={120} />
          </div>
          <div>
            <Label>País</Label>
            <Input value={country} onChange={(e) => setCountry(e.target.value)} maxLength={60} placeholder="Camerún" />
          </div>
          <div>
            <Label>{accountLabel[methodType]} *</Label>
            <Input value={account} onChange={(e) => setAccount(e.target.value)} maxLength={120} />
          </div>
          <div>
            <Label>Notas / referencia (opcional)</Label>
            <Input value={extra} onChange={(e) => setExtra(e.target.value)} maxLength={120} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddPaymentMethodDialog;
