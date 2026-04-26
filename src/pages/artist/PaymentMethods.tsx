import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Star, Pencil, Trash2, Banknote, Smartphone, Wallet, Coins, FileText, ShieldCheck, ShieldAlert, ShieldX, ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useArtistWallet } from '@/hooks/useArtistWallet';
import { toast } from 'sonner';
import AddPaymentMethodDialog from '@/components/artist/AddPaymentMethodDialog';
import {
  WithdrawalMethod,
  METHOD_LABELS,
  STATUS_BADGE,
  formatMethodSummary,
  WITHDRAWAL_ERROR_MAP,
} from '@/lib/withdrawalMethods';

const ICON_BY_TYPE = {
  bank_transfer: Banknote,
  mobile_money: Smartphone,
  paypal: Wallet,
  crypto: Coins,
  manual_other: FileText,
  other: FileText,
} as const;

const STATUS_ICON = {
  verified: ShieldCheck,
  pending_verification: ShieldAlert,
  rejected: ShieldX,
  disabled: ShieldOff,
} as const;

const PaymentMethods = () => {
  const navigate = useNavigate();
  const { artistId, loading } = useArtistWallet();
  const [methods, setMethods] = useState<WithdrawalMethod[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<WithdrawalMethod | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    if (!artistId) return;
    const { data } = await supabase
      .from('artist_withdrawal_methods')
      .select('id, artist_id, user_id, method_type, account_holder_name, country, details_json, payment_details, is_default, verification_status, rejection_reason, last_used_at, created_at, updated_at')
      .eq('artist_id', artistId)
      .order('created_at', { ascending: false });
    setMethods((data as WithdrawalMethod[]) ?? []);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artistId]);

  const setDefault = async (id: string) => {
    setBusy(id);
    const { error } = await supabase
      .from('artist_withdrawal_methods')
      .update({ is_default: true })
      .eq('id', id);
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success('Método marcado como predeterminado');
    load();
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setBusy(deletingId);
    const { error } = await supabase
      .from('artist_withdrawal_methods')
      .delete()
      .eq('id', deletingId);
    setBusy(null);
    setDeletingId(null);
    if (error) {
      const msg = error.message || '';
      const friendly = Object.entries(WITHDRAWAL_ERROR_MAP).find(([k]) => msg.includes(k))?.[1] || error.message;
      toast.error(friendly);
      return;
    }
    toast.success('Método eliminado');
    load();
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando…</div>;
  }

  if (!artistId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card><CardContent className="p-6 text-center">
          <p>No se encontró tu perfil de artista.</p>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => navigate('/artist/wallet')} className="-ml-3">
          <ArrowLeft className="h-4 w-4 mr-2" /> Volver al wallet
        </Button>
        <Button onClick={() => { setEditing(null); setAddOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Añadir método
        </Button>
      </div>

      <div className="blob-card p-6 mb-6">
        <p className="eyebrow mb-1">Configuración</p>
        <h1 className="display-xl text-3xl">Métodos de cobro</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Configura cómo quieres recibir tus retiros. Tus métodos deben ser verificados por YUSIOP antes de poder usarse.
        </p>
      </div>

      {methods.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <p className="text-muted-foreground">Aún no tienes métodos de cobro configurados.</p>
            <Button onClick={() => { setEditing(null); setAddOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Añadir mi primer método
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {methods.map((m) => {
            const Icon = ICON_BY_TYPE[m.method_type] ?? FileText;
            const StatusIcon = STATUS_ICON[m.verification_status] ?? ShieldAlert;
            const status = STATUS_BADGE[m.verification_status];
            return (
              <Card key={m.id} className={m.is_default ? 'border-primary/40' : ''}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex gap-3 min-w-0 flex-1">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{METHOD_LABELS[m.method_type]}</span>
                          {m.is_default && (
                            <Badge variant="outline" className="border-primary/40 text-primary">
                              <Star className="h-3 w-3 mr-1" /> Predeterminado
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{m.account_holder_name}{m.country ? ` · ${m.country}` : ''}</p>
                        <p className="text-xs text-muted-foreground mt-1 truncate">{formatMethodSummary(m)}</p>
                        {m.verification_status === 'rejected' && m.rejection_reason && (
                          <p className="text-xs text-rose-500 mt-1">Motivo: {m.rejection_reason}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className={status?.cls}>
                      <StatusIcon className="h-3 w-3 mr-1" /> {status?.label}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    {!m.is_default && m.verification_status === 'verified' && (
                      <Button size="sm" variant="outline" onClick={() => setDefault(m.id)} disabled={busy === m.id}>
                        <Star className="h-3.5 w-3.5 mr-1" /> Marcar predeterminado
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => { setEditing(m); setAddOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                    </Button>
                    <Button size="sm" variant="outline" className="text-rose-500" onClick={() => setDeletingId(m.id)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Alert className="mt-6">
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle>¿Cómo funciona la verificación?</AlertTitle>
        <AlertDescription>
          Cuando añades o editas un método, queda en estado <strong>pendiente de verificación</strong>. El equipo
          de YUSIOP lo revisará en las próximas 24-72 horas. Solo los métodos verificados pueden usarse para
          solicitar retiros.
        </AlertDescription>
      </Alert>

      <AddPaymentMethodDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        artistId={artistId}
        editing={editing}
        onSaved={() => { load(); setEditing(null); }}
      />

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este método de cobro?</AlertDialogTitle>
            <AlertDialogDescription>
              No podrás recuperarlo. Si tiene retiros activos, no se podrá eliminar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PaymentMethods;
