import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Wallet, Clock, CheckCircle2, AlertOctagon, Banknote, Download as DownloadIcon, Music, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useArtistWallet } from '@/hooks/useArtistWallet';
import { formatXAFFixed } from '@/lib/currency';
import WithdrawalRequestDialog from '@/components/artist/WithdrawalRequestDialog';

type Earning = {
  id: string;
  song_id: string | null;
  artist_amount_xaf: number;
  status: string;
  validation_release_date: string;
  created_at: string;
};

type Withdrawal = {
  id: string;
  amount_requested_xaf: number;
  fee_amount_xaf: number;
  net_amount_xaf: number;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  paid_at: string | null;
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending_validation: { label: 'Pendiente', cls: 'bg-amber-500/15 text-amber-500 border-amber-500/30' },
  available: { label: 'Disponible', cls: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' },
  withdrawn: { label: 'Retirado', cls: 'bg-sky-500/15 text-sky-500 border-sky-500/30' },
  blocked: { label: 'Bloqueado', cls: 'bg-rose-500/15 text-rose-500 border-rose-500/30' },
  refunded: { label: 'Reembolsado', cls: 'bg-muted text-muted-foreground' },
  under_review: { label: 'En revisión', cls: 'bg-orange-500/15 text-orange-500 border-orange-500/30' },
  requested: { label: 'Solicitado', cls: 'bg-amber-500/15 text-amber-500 border-amber-500/30' },
  approved: { label: 'Aprobado', cls: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' },
  paid: { label: 'Pagado', cls: 'bg-sky-500/15 text-sky-500 border-sky-500/30' },
  rejected: { label: 'Rechazado', cls: 'bg-rose-500/15 text-rose-500 border-rose-500/30' },
  cancelled: { label: 'Cancelado', cls: 'bg-muted text-muted-foreground' },
};

const ArtistWallet = () => {
  const navigate = useNavigate();
  const { artistId, summary, settings, loading, reload, trulyAvailable } = useArtistWallet();
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [songsMap, setSongsMap] = useState<Record<string, string>>({});
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const loadHistory = async () => {
    if (!artistId) return;
    const [earningsRes, wRes] = await Promise.all([
      supabase
        .from('artist_earnings')
        .select('id, song_id, artist_amount_xaf, status, validation_release_date, created_at')
        .eq('artist_id', artistId)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('artist_withdrawal_requests')
        .select('id, amount_requested_xaf, fee_amount_xaf, net_amount_xaf, status, rejection_reason, created_at, paid_at')
        .eq('artist_id', artistId)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    const earningsList = (earningsRes.data as Earning[]) ?? [];
    setEarnings(earningsList);
    setWithdrawals((wRes.data as Withdrawal[]) ?? []);

    const songIds = Array.from(new Set(earningsList.map((e) => e.song_id).filter(Boolean))) as string[];
    if (songIds.length) {
      const { data: songs } = await supabase.from('songs').select('id, title').in('id', songIds);
      const map: Record<string, string> = {};
      (songs ?? []).forEach((s) => { map[s.id] = s.title; });
      setSongsMap(map);
    }
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artistId]);

  const refreshAll = async () => {
    await reload();
    await loadHistory();
  };

  // Recarga automática al volver a la pestaña
  useEffect(() => {
    const onFocus = () => { refreshAll(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artistId]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando wallet…</div>;
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

  const earningsBySong = earnings.reduce<Record<string, { title: string; total: number; count: number }>>((acc, e) => {
    const key = e.song_id ?? 'unknown';
    const title = songsMap[key] ?? 'Canción';
    if (!acc[key]) acc[key] = { title, total: 0, count: 0 };
    acc[key].total += e.artist_amount_xaf;
    acc[key].count += 1;
    return acc;
  }, {});
  const songRanking = Object.values(earningsBySong).sort((a, b) => b.total - a.total).slice(0, 20);

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => navigate('/artist')} className="-ml-3">
          <ArrowLeft className="h-4 w-4 mr-2" /> Volver
        </Button>
      </div>

      <div className="blob-card p-6 mb-6">
        <p className="eyebrow mb-1">Wallet</p>
        <h1 className="display-xl text-3xl">Ingresos y Retiros</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Tus ingresos están siendo validados antes de estar disponibles para retiro.
        </p>
      </div>

      {settings?.withdrawals_enabled === false && (
        <Alert className="mb-4">
          <AlertOctagon className="h-4 w-4" />
          <AlertDescription>Los retiros están temporalmente desactivados por administración.</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-500 mb-1"><Clock className="h-4 w-4" /><span className="text-xs">Pendiente</span></div>
            <div className="text-xl font-bold">{formatXAFFixed(summary.pending_xaf)}</div>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-emerald-500 mb-1"><CheckCircle2 className="h-4 w-4" /><span className="text-xs">Disponible</span></div>
            <div className="text-xl font-bold">{formatXAFFixed(trulyAvailable)}</div>
            {summary.reserved_xaf > 0 && (
              <div className="text-[10px] text-muted-foreground">Reservado: {formatXAFFixed(summary.reserved_xaf)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sky-500 mb-1"><Banknote className="h-4 w-4" /><span className="text-xs">Retirado</span></div>
            <div className="text-xl font-bold">{formatXAFFixed(summary.withdrawn_xaf)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-primary mb-1"><Wallet className="h-4 w-4" /><span className="text-xs">Total bruto</span></div>
            <div className="text-xl font-bold">{formatXAFFixed(summary.gross_total_xaf)}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Retirar ingresos</p>
            <p className="text-xs text-muted-foreground">
              Mínimo {settings ? formatXAFFixed(settings.withdrawal_minimum_xaf) : '—'} ·
              {settings ? ` 1 cada ${settings.withdrawal_frequency_days} días` : ''}
            </p>
          </div>
          <Button
            onClick={() => setWithdrawOpen(true)}
            disabled={!settings?.withdrawals_enabled || trulyAvailable < (settings?.withdrawal_minimum_xaf ?? Infinity)}
          >
            <Banknote className="h-4 w-4 mr-2" /> Retirar ingresos
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="earnings">
        <TabsList>
          <TabsTrigger value="earnings"><DownloadIcon className="h-4 w-4 mr-1" /> Ingresos</TabsTrigger>
          <TabsTrigger value="bysong"><Music className="h-4 w-4 mr-1" /> Por canción</TabsTrigger>
          <TabsTrigger value="withdrawals"><Banknote className="h-4 w-4 mr-1" /> Retiros</TabsTrigger>
        </TabsList>

        <TabsContent value="earnings">
          <Card>
            <CardHeader><CardTitle className="text-base">Historial de ingresos</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {earnings.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aún no tienes ingresos registrados.</p>
              ) : earnings.map((e) => {
                const b = STATUS_BADGE[e.status];
                return (
                  <div key={e.id} className="flex items-center justify-between border-b last:border-0 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{e.song_id ? (songsMap[e.song_id] ?? 'Canción') : 'Ingreso'}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(e.created_at).toLocaleDateString()} ·
                        {e.status === 'pending_validation' ? ` libera ${new Date(e.validation_release_date).toLocaleDateString()}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={b?.cls}>{b?.label ?? e.status}</Badge>
                      <span className="font-semibold">{formatXAFFixed(e.artist_amount_xaf)}</span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bysong">
          <Card>
            <CardHeader><CardTitle className="text-base">Ingresos por canción</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {songRanking.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin datos.</p>
              ) : songRanking.map((s, i) => (
                <div key={i} className="flex items-center justify-between border-b last:border-0 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{s.title}</div>
                    <div className="text-xs text-muted-foreground">{s.count} descargas</div>
                  </div>
                  <span className="font-semibold">{formatXAFFixed(s.total)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdrawals">
          <Card>
            <CardHeader><CardTitle className="text-base">Historial de retiros</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {withdrawals.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aún no has solicitado ningún retiro.</p>
              ) : withdrawals.map((w) => {
                const b = STATUS_BADGE[w.status];
                return (
                  <div key={w.id} className="border-b last:border-0 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{formatXAFFixed(w.amount_requested_xaf)}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(w.created_at).toLocaleDateString()} · neto {formatXAFFixed(w.net_amount_xaf)}
                          {w.paid_at ? ` · pagado ${new Date(w.paid_at).toLocaleDateString()}` : ''}
                        </div>
                      </div>
                      <Badge variant="outline" className={b?.cls}>{b?.label ?? w.status}</Badge>
                    </div>
                    {w.rejection_reason && (
                      <div className="text-xs text-rose-500 mt-1">Motivo: {w.rejection_reason}</div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <WithdrawalRequestDialog
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        artistId={artistId}
        availableXaf={trulyAvailable}
        settings={settings}
        onSubmitted={refreshAll}
      />
    </div>
  );
};

export default ArtistWallet;
