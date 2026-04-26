import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Upload, Banknote } from 'lucide-react';
import { toast } from 'sonner';
import { formatXAFFixed } from '@/lib/currency';

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  requestId: string;
  netAmountXaf: number;
  onPaid?: () => void;
};

const MarkPaidDialog = ({ open, onOpenChange, requestId, netAmountXaf, onPaid }: Props) => {
  const { user } = useAuthStore();
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) { setReference(''); setNote(''); setProofFile(null); }
  }, [open]);

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);

    let proofPath: string | null = null;
    if (proofFile) {
      const ext = proofFile.name.split('.').pop() ?? 'pdf';
      const path = `${requestId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('withdrawal-proofs').upload(path, proofFile, { upsert: false });
      if (upErr) {
        setSubmitting(false);
        toast.error(`Error al subir comprobante: ${upErr.message}`);
        return;
      }
      proofPath = path;
    }

    const { error } = await supabase.rpc('admin_mark_withdrawal_paid', {
      p_request_id: requestId,
      p_payment_reference: reference.trim() || null,
      p_payment_proof_url: proofPath,
      p_admin_internal_note: note.trim() || null,
    });
    setSubmitting(false);

    if (error) { toast.error(error.message); return; }
    toast.success('Retiro marcado como pagado');
    onPaid?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Marcar retiro como pagado</DialogTitle>
          <DialogDescription>
            Importe neto a pagar: <strong>{formatXAFFixed(netAmountXaf)}</strong>. Solo continúa cuando hayas
            ejecutado el pago externamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Referencia de pago (opcional)</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={120} placeholder="Ej. tx hash, n.º operación bancaria" />
          </div>
          <div>
            <Label>Nota interna (opcional)</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3} placeholder="Solo visible para administración" />
          </div>
          <div>
            <Label className="flex items-center gap-2">
              <Upload className="h-4 w-4" /> Comprobante (opcional)
            </Label>
            <Input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-[10px] text-muted-foreground mt-1">Solo administradores pueden ver el comprobante.</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Banknote className="h-4 w-4 mr-2" />
              Confirmar pago
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MarkPaidDialog;
