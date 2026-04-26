import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  CheckCircle2, XCircle, Ban, RotateCcw, Banknote, Smartphone, Wallet,
  Coins, FileText, Search, AlertTriangle, Copy, Loader2,
} from 'lucide-react';
import { METHOD_LABELS, STATUS_BADGE, type MethodType, type VerificationStatus } from '@/lib/withdrawalMethods';

type AdminMethod = {
  id: string;
  artist_id: string;
  user_id: string;
  method_type: MethodType;
  account_holder_name: string;
  country: string | null;
  details_json: Record<string, string>;
  payment_details: Record<string, string>;
  is_default: boolean;
  verification_status: VerificationStatus;
  rejection_reason: string | null;
  last_used_at: string | null;
  created_at: string;
};

const ICON_BY_TYPE = {
  bank_transfer: Banknote, mobile_money: Smartphone, paypal: Wallet,
  crypto: Coins, manual_other: FileText, other: FileText,
} as const;

const PaymentMethodsAdmin = () => {
  const [methods, setMethods] = useState<AdminMethod[]>([]);
  const [artistsMap, setArtistsMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('');
  const [detailsOf, setDetailsOf] = useState<AdminMethod | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('artist_withdrawal_methods')
      .select('id, artist_id, user_id, method_type, account_holder_name, country, details_json, payment_details, is_default, verification_status, rejection_reason, last_used_at, created_at')
      .order('created_at', { ascending: false });
    setMethods((data as AdminMethod[]) ?? []);
    const ids = Array.from(new Set((data ?? []).map((d) => (d as AdminMethod).artist_id)));
    if (ids.length) {
      const { data: artists } = await supabase.from('artists').select('id, name').in('id', ids);
      const map: Record<string, string> = {};
      (artists ?? []).forEach((a) => { map[a.id] = a.name; });
      setArtistsMap(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = methods.filter((m) => {
    if (statusFilter !== 'all' && m.verification_status !== statusFilter) return false;
    if (typeFilter !== 'all' && m.method_type !== typeFilter) return false;
    if (countryFilter && !(m.country ?? '').toLowerCase().includes(countryFilter.toLowerCase())) return false;
    if (search) {
      const s = search.toLowerCase();
      const name = (artistsMap[m.artist_id] ?? '').toLowerCase();
      if (!name.includes(s) && !m.account_holder_name.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const setStatus = async (methodId: string, status: VerificationStatus, reason?: string) => {
    setBusy(methodId);
    const { error } = await supabase.rpc('admin_set_method_status', {
      p_method_id: methodId,
      p_status: status,
      p_reason: reason ?? null,
    });
    setBusy(null);
    if (error) { toast.error(error.message); return false; }
    toast.success('Estado del método actualizado');
    load();
    return true;
  };

  const handleReject = async () => {
    if (!rejectId || !rejectReason.trim()) return;
    const ok = await setStatus(rejectId, 'rejected', rejectReason.trim());
    if (ok) { setRejectId(null); setRejectReason(''); }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copiado');
    } catch { toast.error('No se pudo copiar'); }
  };

  return (
    <div className="p-6 space-y-4 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">Métodos de cobro</h1>
        <p className="text-sm text-muted-foreground">
          Verifica, rechaza o deshabilita los métodos de cobro registrados por los artistas.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label>Buscar</Label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" placeholder="Artista o titular" />
            </div>
          </div>
          <div>
            <Label>Estado</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending_verification">Pendientes</SelectItem>
                <SelectItem value="verified">Verificados</SelectItem>
                <SelectItem value="rejected">Rechazados</SelectItem>
                <SelectItem value="disabled">Deshabilitados</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="bank_transfer">Banco</SelectItem>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="crypto">Crypto</SelectItem>
                <SelectItem value="manual_other">Otro manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>País</Label>
            <Input value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} placeholder="Filtrar por país" />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-muted-foreground text-sm">Cargando…</p>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">No hay métodos que coincidan.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => {
            const Icon = ICON_BY_TYPE[m.method_type] ?? FileText;
            const status = STATUS_BADGE[m.verification_status];
            return (
              <Card key={m.id}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap justify-between items-start gap-3">
                    <div className="flex gap-3 min-w-0 flex-1">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold">{artistsMap[m.artist_id] ?? m.artist_id}</p>
                        <p className="text-sm">
                          {METHOD_LABELS[m.method_type]} · {m.account_holder_name}
                          {m.country ? ` · ${m.country}` : ''}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(m.created_at).toLocaleString()}
                          {m.is_default && ' · ⭐ predeterminado'}
                        </p>
                        {m.verification_status === 'rejected' && m.rejection_reason && (
                          <p className="text-xs text-rose-500 mt-1">Motivo rechazo: {m.rejection_reason}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className={status?.cls}>{status?.label}</Badge>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    <Button size="sm" variant="outline" onClick={() => setDetailsOf(m)}>
                      Ver detalles
                    </Button>
                    {m.verification_status !== 'verified' && (
                      <Button size="sm" onClick={() => setStatus(m.id, 'verified')} disabled={busy === m.id}>
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Aprobar
                      </Button>
                    )}
                    {m.verification_status !== 'rejected' && (
                      <Button size="sm" variant="outline" onClick={() => { setRejectId(m.id); setRejectReason(''); }}>
                        <XCircle className="h-4 w-4 mr-1" /> Rechazar
                      </Button>
                    )}
                    {m.verification_status !== 'disabled' && (
                      <Button size="sm" variant="outline" onClick={() => setStatus(m.id, 'disabled')} disabled={busy === m.id}>
                        <Ban className="h-4 w-4 mr-1" /> Deshabilitar
                      </Button>
                    )}
                    {m.verification_status !== 'pending_verification' && (
                      <Button size="sm" variant="ghost" onClick={() => setStatus(m.id, 'pending_verification')} disabled={busy === m.id}>
                        <RotateCcw className="h-4 w-4 mr-1" /> Volver a pendiente
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detalles dialog */}
      <Dialog open={!!detailsOf} onOpenChange={(o) => !o && setDetailsOf(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles del método</DialogTitle>
            <DialogDescription>
              Datos completos. Verifica cuidadosamente antes de aprobar.
            </DialogDescription>
          </DialogHeader>
          {detailsOf && (
            <div className="space-y-3 text-sm">
              <DetailRow label="Artista" value={artistsMap[detailsOf.artist_id] ?? detailsOf.artist_id} />
              <DetailRow label="Tipo" value={METHOD_LABELS[detailsOf.method_type]} />
              <DetailRow label="Titular" value={detailsOf.account_holder_name} onCopy={() => copy(detailsOf.account_holder_name)} />
              {detailsOf.country && <DetailRow label="País" value={detailsOf.country} />}
              {detailsOf.method_type === 'crypto' && (
                <Alert className="border-amber-500/40 bg-amber-500/5">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <AlertDescription>
                    Verifica la red antes de enviar. Los pagos crypto son irreversibles.
                  </AlertDescription>
                </Alert>
              )}
              {Object.entries(detailsOf.details_json ?? {}).map(([k, v]) => (
                k === 'id_document_path' ? (
                  <KycRow key={k} path={v as string} />
                ) : (
                  <DetailRow key={k} label={prettyLabel(k)} value={String(v)} onCopy={() => copy(String(v))} mono={k === 'wallet_address' || k === 'iban'} />
                )
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectId} onOpenChange={(o) => !o && setRejectId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rechazar método de cobro</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Motivo del rechazo *</Label>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} maxLength={500} rows={4} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRejectId(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleReject} disabled={!rejectReason.trim() || busy === rejectId}>
                {busy === rejectId && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Rechazar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const DetailRow = ({ label, value, onCopy, mono }: { label: string; value: string; onCopy?: () => void; mono?: boolean }) => (
  <div className="flex justify-between items-start gap-3">
    <span className="text-xs text-muted-foreground shrink-0">{label}</span>
    <span className={`text-right break-all ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    {onCopy && (
      <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={onCopy}>
        <Copy className="h-3 w-3" />
      </Button>
    )}
  </div>
);

const KycRow = ({ path }: { path: string }) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    supabase.storage.from('artist-kyc').createSignedUrl(path, 60 * 5).then(({ data }) => {
      if (data?.signedUrl) setUrl(data.signedUrl);
    });
  }, [path]);
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-muted-foreground">Documento KYC</span>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary text-xs underline">Abrir documento</a>
      ) : (
        <span className="text-xs text-muted-foreground">Generando enlace…</span>
      )}
    </div>
  );
};

const prettyLabel = (k: string): string => {
  const map: Record<string, string> = {
    bank_name: 'Banco',
    iban: 'IBAN / cuenta',
    swift: 'SWIFT/BIC',
    operator: 'Operador',
    phone_number: 'Teléfono',
    email: 'Email',
    stablecoin: 'Stablecoin',
    network: 'Red',
    wallet_address: 'Dirección wallet',
    method_name: 'Nombre del método',
    details: 'Detalles',
    note: 'Nota',
  };
  return map[k] ?? k;
};

export default PaymentMethodsAdmin;
