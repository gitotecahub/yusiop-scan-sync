import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { formatXAFFixed } from '@/lib/currency';
import { CheckCircle2, XCircle, Banknote, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';

type Request = {
  id: string;
  artist_id: string;
  amount_requested_xaf: number;
  fee_amount_xaf: number;
  net_amount_xaf: number;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  paid_at: string | null;
  payment_method_snapshot: Record<string, unknown> | null;
};

type Settings = {
  artist_percentage: number;
  value_per_download_xaf: number;
  withdrawal_minimum_xaf: number;
  withdrawal_frequency_days: number;
  validation_period_days: number;
  withdrawal_fee_type: 'none' | 'fixed' | 'percent';
  withdrawal_fee_value: number;
  withdrawals_enabled: boolean;
  auto_release_enabled: boolean;
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  requested: { label: 'Solicitado', cls: 'bg-amber-500/15 text-amber-500 border-amber-500/30' },
  under_review: { label: 'En revisión', cls: 'bg-orange-500/15 text-orange-500 border-orange-500/30' },
  approved: { label: 'Aprobado', cls: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' },
  paid: { label: 'Pagado', cls: 'bg-sky-500/15 text-sky-500 border-sky-500/30' },
  rejected: { label: 'Rechazado', cls: 'bg-rose-500/15 text-rose-500 border-rose-500/30' },
  cancelled: { label: 'Cancelado', cls: 'bg-muted text-muted-foreground' },
};

const Withdrawals = () => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [artistsMap, setArtistsMap] = useState<Record<string, string>>({});
  const [settings, setSettings] = useState<Settings | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [savingSettings, setSavingSettings] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    total_downloads: number; will_create?: number; inserted?: number; skipped: number; estimated_artist_xaf_total: number; dry_run: boolean;
  } | null>(null);

  const load = async () => {
    const { data: reqs } = await supabase
      .from('artist_withdrawal_requests')
      .select('id, artist_id, amount_requested_xaf, fee_amount_xaf, net_amount_xaf, status, rejection_reason, created_at, paid_at, payment_method_snapshot')
      .order('created_at', { ascending: false });
    setRequests((reqs as Request[]) ?? []);

    const ids = Array.from(new Set((reqs ?? []).map((r) => r.artist_id)));
    if (ids.length) {
      const { data: artists } = await supabase.from('artists').select('id, name').in('id', ids);
      const map: Record<string, string> = {};
      (artists ?? []).forEach((a) => { map[a.id] = a.name; });
      setArtistsMap(map);
    }

    const { data: s } = await supabase.from('admin_financial_settings').select('*').eq('id', 1).maybeSingle();
    if (s) setSettings(s as unknown as Settings);
  };

  useEffect(() => { load(); }, []);

  const filtered = statusFilter === 'all' ? requests : requests.filter((r) => r.status === statusFilter);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    const { error } = await supabase.rpc('admin_approve_withdrawal', { p_request_id: id });
    setActionLoading(null);
    if (error) return toast.error(error.message);
    toast.success('Solicitud aprobada');
    load();
  };

  const handlePay = async (id: string) => {
    setActionLoading(id);
    const { error } = await supabase.rpc('admin_mark_withdrawal_paid', { p_request_id: id });
    setActionLoading(null);
    if (error) return toast.error(error.message);
    toast.success('Marcado como pagado');
    load();
  };

  const handleReject = async () => {
    if (!rejectId || !rejectReason.trim()) return;
    setActionLoading(rejectId);
    const { error } = await supabase.rpc('admin_reject_withdrawal', { p_request_id: rejectId, p_reason: rejectReason.trim() });
    setActionLoading(null);
    if (error) return toast.error(error.message);
    toast.success('Solicitud rechazada');
    setRejectId(null);
    setRejectReason('');
    load();
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);
    const { error } = await supabase.from('admin_financial_settings').update({
      artist_percentage: settings.artist_percentage,
      platform_percentage: 100 - Number(settings.artist_percentage),
      value_per_download_xaf: settings.value_per_download_xaf,
      withdrawal_minimum_xaf: settings.withdrawal_minimum_xaf,
      withdrawal_frequency_days: settings.withdrawal_frequency_days,
      validation_period_days: settings.validation_period_days,
      withdrawal_fee_type: settings.withdrawal_fee_type,
      withdrawal_fee_value: settings.withdrawal_fee_value,
      withdrawals_enabled: settings.withdrawals_enabled,
      auto_release_enabled: settings.auto_release_enabled,
    }).eq('id', 1);
    setSavingSettings(false);
    if (error) return toast.error(error.message);
    toast.success('Configuración guardada');
  };

  const runSync = async (dryRun: boolean) => {
    setSyncing(true);
    const { data, error } = await supabase.rpc('sync_historical_earnings', { p_dry_run: dryRun });
    setSyncing(false);
    if (error) return toast.error(error.message);
    setSyncResult(data as typeof syncResult);
    if (!dryRun) toast.success('Sincronización ejecutada');
  };

  return (
    <div className="p-6 space-y-4 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">Retiros de Artistas</h1>
        <p className="text-sm text-muted-foreground">Gestiona solicitudes, configuración financiera y sincronización de ingresos.</p>
      </div>

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests">Solicitudes</TabsTrigger>
          <TabsTrigger value="settings">Configuración</TabsTrigger>
          <TabsTrigger value="sync">Ingresos históricos</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-3">
          <div className="flex items-center gap-2">
            <Label>Filtrar:</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="requested">Solicitadas</SelectItem>
                <SelectItem value="approved">Aprobadas</SelectItem>
                <SelectItem value="paid">Pagadas</SelectItem>
                <SelectItem value="rejected">Rechazadas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">No hay solicitudes.</CardContent></Card>
          ) : filtered.map((r) => {
            const b = STATUS_BADGE[r.status];
            const method = r.payment_method_snapshot as Record<string, unknown> | null;
            return (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
                      <div className="font-semibold">{artistsMap[r.artist_id] ?? r.artist_id}</div>
                    </div>
                    <Badge variant="outline" className={b?.cls}>{b?.label}</Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                    <div><div className="text-xs text-muted-foreground">Solicitado</div><div className="font-semibold">{formatXAFFixed(r.amount_requested_xaf)}</div></div>
                    <div><div className="text-xs text-muted-foreground">Comisión</div><div>{formatXAFFixed(r.fee_amount_xaf)}</div></div>
                    <div><div className="text-xs text-muted-foreground">Neto</div><div className="font-semibold text-primary">{formatXAFFixed(r.net_amount_xaf)}</div></div>
                    <div>
                      <div className="text-xs text-muted-foreground">Método</div>
                      <div className="text-xs">
                        {method ? `${String(method.method_type)} · ${String(method.account_holder_name)}` : '—'}
                      </div>
                    </div>
                  </div>

                  {method?.payment_details ? (
                    <pre className="text-[10px] bg-muted p-2 rounded mb-3 overflow-auto">{JSON.stringify(method.payment_details, null, 2)}</pre>
                  ) : null}

                  {r.rejection_reason && (
                    <div className="text-xs text-rose-500 mb-2">Motivo rechazo: {r.rejection_reason}</div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {r.status === 'requested' && (
                      <Button size="sm" onClick={() => handleApprove(r.id)} disabled={actionLoading === r.id}>
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Aprobar
                      </Button>
                    )}
                    {r.status === 'approved' && (
                      <Button size="sm" onClick={() => handlePay(r.id)} disabled={actionLoading === r.id}>
                        <Banknote className="h-4 w-4 mr-1" /> Marcar como pagado
                      </Button>
                    )}
                    {(r.status === 'requested' || r.status === 'approved') && (
                      <Button size="sm" variant="outline" onClick={() => { setRejectId(r.id); setRejectReason(''); }}>
                        <XCircle className="h-4 w-4 mr-1" /> Rechazar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="settings">
          {!settings ? <p>Cargando…</p> : (
            <Card>
              <CardHeader><CardTitle>Configuración financiera</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>% Artista</Label>
                    <Input type="number" step="0.01" value={settings.artist_percentage}
                      onChange={(e) => setSettings({ ...settings, artist_percentage: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Valor por descarga (XAF)</Label>
                    <Input type="number" value={settings.value_per_download_xaf}
                      onChange={(e) => setSettings({ ...settings, value_per_download_xaf: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Mínimo de retiro (XAF)</Label>
                    <Input type="number" value={settings.withdrawal_minimum_xaf}
                      onChange={(e) => setSettings({ ...settings, withdrawal_minimum_xaf: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Frecuencia (días)</Label>
                    <Input type="number" value={settings.withdrawal_frequency_days}
                      onChange={(e) => setSettings({ ...settings, withdrawal_frequency_days: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Periodo de validación (días)</Label>
                    <Input type="number" value={settings.validation_period_days}
                      onChange={(e) => setSettings({ ...settings, validation_period_days: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Tipo de comisión</Label>
                    <Select value={settings.withdrawal_fee_type} onValueChange={(v) => setSettings({ ...settings, withdrawal_fee_type: v as Settings['withdrawal_fee_type'] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin comisión</SelectItem>
                        <SelectItem value="fixed">Fija (XAF)</SelectItem>
                        <SelectItem value="percent">Porcentual (%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Valor de comisión</Label>
                    <Input type="number" step="0.01" value={settings.withdrawal_fee_value}
                      onChange={(e) => setSettings({ ...settings, withdrawal_fee_value: Number(e.target.value) })} />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Retiros activados</p>
                    <p className="text-xs text-muted-foreground">Si está desactivado, los artistas no podrán solicitar retiros.</p>
                  </div>
                  <Switch checked={settings.withdrawals_enabled} onCheckedChange={(v) => setSettings({ ...settings, withdrawals_enabled: v })} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Auto-liberación de ingresos</p>
                    <p className="text-xs text-muted-foreground">Pasa automáticamente los ingresos a "disponible" tras el periodo de validación.</p>
                  </div>
                  <Switch checked={settings.auto_release_enabled} onCheckedChange={(v) => setSettings({ ...settings, auto_release_enabled: v })} />
                </div>

                <Button onClick={saveSettings} disabled={savingSettings}>
                  {savingSettings && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Guardar configuración
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sync">
          <Card>
            <CardHeader><CardTitle>Sincronizar ingresos históricos</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Esta herramienta lee todas las descargas históricas de <code>user_downloads</code> y crea
                  registros en <code>artist_earnings</code> para las que aún no tengan uno. No genera duplicados.
                  Las descargas anteriores al periodo de validación pasarán directamente a "disponible".
                </AlertDescription>
              </Alert>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => runSync(true)} disabled={syncing}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Vista previa
                </Button>
                <Button onClick={() => runSync(false)} disabled={syncing}>
                  {syncing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Ejecutar sincronización
                </Button>
              </div>

              {syncResult && (
                <Card className="bg-muted/40">
                  <CardContent className="p-4 text-sm space-y-1">
                    <div>Modo: <strong>{syncResult.dry_run ? 'Vista previa' : 'Ejecutado'}</strong></div>
                    <div>Descargas reales detectadas: <strong>{syncResult.total_downloads}</strong></div>
                    <div>{syncResult.dry_run ? 'A crear' : 'Insertados'}: <strong>{syncResult.dry_run ? syncResult.will_create : syncResult.inserted}</strong></div>
                    <div>Omitidos (ya existen o sin artista): <strong>{syncResult.skipped}</strong></div>
                    <div>Importe estimado para artistas: <strong>{formatXAFFixed(syncResult.estimated_artist_xaf_total)}</strong></div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!rejectId} onOpenChange={(o) => !o && setRejectId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rechazar solicitud</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Motivo del rechazo *</Label>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} maxLength={500} rows={4} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRejectId(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleReject} disabled={!rejectReason.trim() || actionLoading === rejectId}>
                Rechazar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Withdrawals;
