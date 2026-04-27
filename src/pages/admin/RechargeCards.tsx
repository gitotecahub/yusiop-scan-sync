import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Search,
  Plus,
  Wallet as WalletIcon,
  Copy,
  Download as DownloadIcon,
  Ban,
  RefreshCcw,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatXAFFixed } from '@/lib/currency';

interface RechargeCardRow {
  id: string;
  code: string;
  amount: number;
  currency: string;
  status: 'active' | 'used' | 'expired' | 'disabled';
  batch: string | null;
  notes: string | null;
  expires_at: string | null;
  used_at: string | null;
  used_by: string | null;
  used_by_username: string | null;
  used_by_full_name: string | null;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Activa',
  used: 'Usada',
  expired: 'Caducada',
  disabled: 'Desactivada',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  used: 'secondary',
  expired: 'outline',
  disabled: 'destructive',
};

const RechargeCards = () => {
  const { toast } = useToast();
  const [cards, setCards] = useState<RechargeCardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [batchFilter, setBatchFilter] = useState<string>('all');
  const [showGenerate, setShowGenerate] = useState(false);

  // Form
  const [genQty, setGenQty] = useState('10');
  const [genAmount, setGenAmount] = useState('5000');
  const [genBatch, setGenBatch] = useState('');
  const [genExpires, setGenExpires] = useState('');
  const [genNotes, setGenNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<{ code: string; id: string }[] | null>(null);

  const fetchCards = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_list_recharge_cards', {
      p_status: statusFilter === 'all' ? null : statusFilter,
      p_batch: batchFilter === 'all' ? null : batchFilter,
      p_search: search.trim() || null,
      p_limit: 200,
      p_offset: 0,
    });
    setLoading(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    const payload = data as any;
    if (!payload?.success) {
      toast({ title: 'Error', description: payload?.error ?? 'forbidden', variant: 'destructive' });
      return;
    }
    setCards(payload.cards as RechargeCardRow[]);
  };

  useEffect(() => {
    fetchCards();
    const channel = supabase
      .channel('admin-recharge-cards-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recharge_cards' }, () => {
        fetchCards();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, batchFilter]);

  const batches = useMemo(() => {
    const set = new Set<string>();
    cards.forEach((c) => c.batch && set.add(c.batch));
    return Array.from(set).sort();
  }, [cards]);

  const stats = useMemo(() => {
    const total = cards.length;
    const active = cards.filter((c) => c.status === 'active').length;
    const used = cards.filter((c) => c.status === 'used').length;
    const valueActive = cards
      .filter((c) => c.status === 'active')
      .reduce((sum, c) => sum + Number(c.amount || 0), 0);
    const valueUsed = cards
      .filter((c) => c.status === 'used')
      .reduce((sum, c) => sum + Number(c.amount || 0), 0);
    return { total, active, used, valueActive, valueUsed };
  }, [cards]);

  const handleGenerate = async () => {
    const qty = parseInt(genQty, 10);
    const amt = parseInt(genAmount, 10);
    if (!qty || qty < 1 || qty > 1000) {
      toast({ title: 'Cantidad inválida', description: 'Entre 1 y 1000', variant: 'destructive' });
      return;
    }
    if (!amt || amt < 100) {
      toast({ title: 'Monto inválido', description: 'Mínimo 100 XAF', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    const { data, error } = await supabase.rpc('admin_generate_recharge_cards', {
      p_quantity: qty,
      p_amount_xaf: amt,
      p_batch: genBatch.trim() || null,
      p_expires_at: genExpires ? new Date(genExpires).toISOString() : null,
      p_notes: genNotes.trim() || null,
    });
    setGenerating(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    const payload = data as any;
    if (!payload?.success) {
      toast({ title: 'Error', description: payload?.error ?? 'unknown', variant: 'destructive' });
      return;
    }
    setGenerated(payload.cards as { id: string; code: string }[]);
    toast({ title: '✅ Tarjetas generadas', description: `${qty} códigos creados` });
    fetchCards();
  };

  const resetGenerator = () => {
    setGenerated(null);
    setGenQty('10');
    setGenAmount('5000');
    setGenBatch('');
    setGenExpires('');
    setGenNotes('');
  };

  const downloadCSV = () => {
    if (!generated || generated.length === 0) return;
    const header = 'code,amount_xaf,batch,expires_at\n';
    const rows = generated
      .map((g) => `${g.code},${genAmount},${genBatch},${genExpires || ''}`)
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recharge-cards-${genBatch || 'lote'}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyAll = async () => {
    if (!generated) return;
    await navigator.clipboard.writeText(generated.map((g) => g.code).join('\n'));
    toast({ title: 'Copiado', description: `${generated.length} códigos` });
  };

  const handleDisable = async (id: string) => {
    if (!confirm('¿Desactivar esta tarjeta? No podrá ser canjeada.')) return;
    const { data, error } = await supabase.rpc('admin_disable_recharge_card', { p_card_id: id });
    if (error || !(data as any)?.success) {
      toast({ title: 'Error', description: error?.message ?? (data as any)?.error, variant: 'destructive' });
      return;
    }
    toast({ title: 'Tarjeta desactivada' });
    fetchCards();
  };

  const handleReactivate = async (id: string) => {
    const { data, error } = await supabase.rpc('admin_reactivate_recharge_card', { p_card_id: id });
    if (error || !(data as any)?.success) {
      toast({ title: 'Error', description: error?.message ?? (data as any)?.error, variant: 'destructive' });
      return;
    }
    toast({ title: 'Tarjeta reactivada' });
    fetchCards();
  };

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    toast({ title: 'Código copiado', description: code });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <WalletIcon className="h-6 w-6 text-primary" />
            Tarjetas Recargables
          </h1>
          <p className="text-sm text-muted-foreground">
            Genera códigos físicos <code>WAL-XXXXXXXX</code> para recargar saldo del wallet.
          </p>
        </div>
        <Button onClick={() => { resetGenerator(); setShowGenerate(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Generar lote
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Activas</p>
            <p className="text-2xl font-bold text-primary">{stats.active}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatXAFFixed(stats.valueActive)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Usadas</p>
            <p className="text-2xl font-bold">{stats.used}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatXAFFixed(stats.valueUsed)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Lotes</p>
            <p className="text-2xl font-bold">{batches.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchCards()}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="active">Activas</SelectItem>
              <SelectItem value="used">Usadas</SelectItem>
              <SelectItem value="expired">Caducadas</SelectItem>
              <SelectItem value="disabled">Desactivadas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={batchFilter} onValueChange={setBatchFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Lote" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los lotes</SelectItem>
              {batches.map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchCards}>
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>Tarjetas ({cards.length})</CardTitle>
          <CardDescription>Listado con estado, lote y uso</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : cards.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay tarjetas</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground border-b">
                  <tr>
                    <th className="py-2 pr-3">Código</th>
                    <th className="py-2 pr-3">Monto</th>
                    <th className="py-2 pr-3">Estado</th>
                    <th className="py-2 pr-3">Lote</th>
                    <th className="py-2 pr-3">Caduca</th>
                    <th className="py-2 pr-3">Usada por</th>
                    <th className="py-2 pr-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cards.map((c) => (
                    <tr key={c.id} className="border-b hover:bg-muted/40">
                      <td className="py-2 pr-3 font-mono text-xs">
                        <button
                          onClick={() => copyCode(c.code)}
                          className="hover:text-primary inline-flex items-center gap-1"
                        >
                          {c.code}
                          <Copy className="h-3 w-3" />
                        </button>
                      </td>
                      <td className="py-2 pr-3 font-medium">{formatXAFFixed(Number(c.amount))}</td>
                      <td className="py-2 pr-3">
                        <Badge variant={STATUS_VARIANT[c.status]}>{STATUS_LABEL[c.status]}</Badge>
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">{c.batch ?? '—'}</td>
                      <td className="py-2 pr-3 text-muted-foreground text-xs">
                        {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground text-xs">
                        {c.used_by_username || c.used_by_full_name
                          ? `${c.used_by_username ?? c.used_by_full_name} · ${
                              c.used_at ? new Date(c.used_at).toLocaleDateString() : ''
                            }`
                          : '—'}
                      </td>
                      <td className="py-2 pr-3 text-right">
                        {c.status === 'active' && (
                          <Button size="sm" variant="ghost" onClick={() => handleDisable(c.id)}>
                            <Ban className="h-3.5 w-3.5 mr-1" />
                            Desactivar
                          </Button>
                        )}
                        {c.status === 'disabled' && (
                          <Button size="sm" variant="ghost" onClick={() => handleReactivate(c.id)}>
                            <RefreshCcw className="h-3.5 w-3.5 mr-1" />
                            Reactivar
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate dialog */}
      <Dialog open={showGenerate} onOpenChange={(o) => { setShowGenerate(o); if (!o) resetGenerator(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{generated ? '✅ Lote generado' : 'Generar lote de tarjetas'}</DialogTitle>
            <DialogDescription>
              {generated
                ? `${generated.length} códigos creados. Cópialos o descárgalos en CSV para imprimir.`
                : 'Crea códigos físicos WAL-XXXXXXXX con un monto fijo en XAF.'}
            </DialogDescription>
          </DialogHeader>

          {generated ? (
            <div className="space-y-3">
              <div className="rounded-lg border bg-muted/40 p-3 max-h-64 overflow-y-auto font-mono text-xs">
                {generated.map((g) => (
                  <div key={g.id} className="py-0.5">{g.code}</div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button onClick={downloadCSV} className="flex-1">
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  Descargar CSV
                </Button>
                <Button variant="outline" onClick={copyAll} className="flex-1">
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar todos
                </Button>
              </div>
              <Button variant="ghost" onClick={() => { resetGenerator(); }} className="w-full">
                Generar otro lote
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Cantidad</Label>
                  <Input
                    type="number"
                    min={1}
                    max={1000}
                    value={genQty}
                    onChange={(e) => setGenQty(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Monto por tarjeta (XAF)</Label>
                  <Input
                    type="number"
                    min={100}
                    value={genAmount}
                    onChange={(e) => setGenAmount(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Lote (opcional)</Label>
                <Input
                  placeholder="Ej: ENERO-2026"
                  value={genBatch}
                  onChange={(e) => setGenBatch(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Caduca el (opcional)</Label>
                <Input
                  type="date"
                  value={genExpires}
                  onChange={(e) => setGenExpires(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Notas (opcional)</Label>
                <Textarea
                  rows={2}
                  value={genNotes}
                  onChange={(e) => setGenNotes(e.target.value)}
                  placeholder="Notas internas..."
                />
              </div>
              <div className="rounded-md bg-primary/10 p-3 text-xs text-muted-foreground">
                <CheckCircle2 className="inline h-3.5 w-3.5 mr-1 text-primary" />
                Total a emitir:{' '}
                <span className="font-semibold text-foreground">
                  {formatXAFFixed((parseInt(genQty, 10) || 0) * (parseInt(genAmount, 10) || 0))}
                </span>{' '}
                en {genQty || 0} tarjetas
              </div>
            </div>
          )}

          {!generated && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowGenerate(false)} disabled={generating}>
                Cancelar
              </Button>
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generar'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RechargeCards;
