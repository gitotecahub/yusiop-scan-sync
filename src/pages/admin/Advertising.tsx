import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Megaphone, CheckCircle2, XCircle, Plus, MousePointerClick, Eye, TrendingUp,
  Loader2, RefreshCw, Mail,
} from 'lucide-react';

type CampaignType = 'artist_release' | 'external_business' | 'yusiop_service';
type CampaignStatus = 'draft' | 'pending_payment' | 'pending_review' | 'active' | 'rejected' | 'expired' | 'cancelled';
type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

interface Campaign {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  cta_text: string | null;
  cta_url: string | null;
  campaign_type: CampaignType;
  status: CampaignStatus;
  payment_status: PaymentStatus;
  start_date: string | null;
  end_date: string | null;
  duration_days: number | null;
  price_eur: number | null;
  price_xaf: number | null;
  impressions: number;
  clicks: number;
  priority: number;
  created_at: string;
  rejection_reason: string | null;
}

interface AdRequest {
  id: string;
  name: string;
  company_name: string | null;
  email: string;
  phone: string | null;
  ad_type: string;
  sector: string | null;
  message: string | null;
  budget: string | null;
  desired_dates: string | null;
  asset_url: string | null;
  status: 'new' | 'contacted' | 'proposal_sent' | 'converted' | 'rejected';
  created_at: string;
}

const STATUS_BADGE: Record<CampaignStatus, { label: string; variant: any }> = {
  draft: { label: 'Borrador', variant: 'outline' },
  pending_payment: { label: 'Esperando pago', variant: 'secondary' },
  pending_review: { label: 'En revisión', variant: 'secondary' },
  active: { label: 'Activa', variant: 'default' },
  rejected: { label: 'Rechazada', variant: 'destructive' },
  expired: { label: 'Expirada', variant: 'outline' },
  cancelled: { label: 'Cancelada', variant: 'outline' },
};

const REQ_STATUS_BADGE: Record<AdRequest['status'], { label: string; variant: any }> = {
  new: { label: 'Nueva', variant: 'default' },
  contacted: { label: 'Contactada', variant: 'secondary' },
  proposal_sent: { label: 'Propuesta enviada', variant: 'secondary' },
  converted: { label: 'Convertida', variant: 'default' },
  rejected: { label: 'Rechazada', variant: 'destructive' },
};

const Advertising = () => {
  const [tab, setTab] = useState('active');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [requests, setRequests] = useState<AdRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [creatingYusiop, setCreatingYusiop] = useState(false);

  const load = async () => {
    setLoading(true);
    const [campRes, reqRes] = await Promise.all([
      supabase.from('ad_campaigns').select('*').order('created_at', { ascending: false }),
      supabase.from('ad_requests').select('*').order('created_at', { ascending: false }),
    ]);
    setCampaigns((campRes.data as Campaign[]) ?? []);
    setRequests((reqRes.data as AdRequest[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const expireOld = async () => {
    await supabase.rpc('expire_ad_campaigns');
    await load();
    toast.success('Campañas expiradas actualizadas');
  };

  const approve = async (id: string) => {
    const { error } = await supabase.rpc('admin_approve_ad_campaign', { p_campaign_id: id });
    if (error) return toast.error(error.message);
    // Para campañas externas o de artistas que ya pagaron, dejarla activa+paid
    await supabase.from('ad_campaigns').update({ payment_status: 'paid' }).eq('id', id);
    toast.success('Campaña aprobada');
    load();
  };

  const reject = async (id: string) => {
    const reason = prompt('Razón del rechazo (opcional):') ?? '';
    const { error } = await supabase.rpc('admin_reject_ad_campaign', {
      p_campaign_id: id, p_reason: reason || null,
    });
    if (error) return toast.error(error.message);
    toast.success('Campaña rechazada');
    load();
  };

  const toggleActive = async (c: Campaign) => {
    const newStatus: CampaignStatus = c.status === 'active' ? 'cancelled' : 'active';
    const { error } = await supabase.from('ad_campaigns').update({ status: newStatus }).eq('id', c.id);
    if (error) return toast.error(error.message);
    toast.success(newStatus === 'active' ? 'Campaña activada' : 'Campaña desactivada');
    load();
  };

  const updateRequestStatus = async (id: string, status: AdRequest['status']) => {
    const { error } = await supabase.from('ad_requests').update({ status }).eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Solicitud actualizada');
    load();
  };

  // Métricas
  const active = campaigns.filter((c) => c.status === 'active');
  const pending = campaigns.filter((c) => ['pending_review', 'pending_payment'].includes(c.status));
  const totalImpressions = campaigns.reduce((acc, c) => acc + (c.impressions ?? 0), 0);
  const totalClicks = campaigns.reduce((acc, c) => acc + (c.clicks ?? 0), 0);
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const totalRevenueEur = campaigns
    .filter((c) => c.payment_status === 'paid')
    .reduce((acc, c) => acc + Number(c.price_eur ?? 0), 0);
  const newRequests = requests.filter((r) => r.status === 'new').length;

  const CampaignRow = ({ c, showActions = true }: { c: Campaign; showActions?: boolean }) => (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2 min-w-0">
          {c.image_url ? (
            <img src={c.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <Megaphone className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-medium text-sm truncate max-w-[200px]">{c.title}</p>
            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{c.subtitle}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="text-[10px]">
          {c.campaign_type === 'artist_release' ? 'Artista' :
           c.campaign_type === 'external_business' ? 'Empresa' : 'YUSIOP'}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant={STATUS_BADGE[c.status].variant}>{STATUS_BADGE[c.status].label}</Badge>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {c.start_date ? new Date(c.start_date).toLocaleDateString() : '—'} →{' '}
        {c.end_date ? new Date(c.end_date).toLocaleDateString() : '—'}
      </TableCell>
      <TableCell className="text-xs">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />{c.impressions}</span>
          <span className="inline-flex items-center gap-1"><MousePointerClick className="h-3 w-3" />{c.clicks}</span>
        </div>
      </TableCell>
      <TableCell className="text-xs font-medium">
        {Number(c.price_eur ?? 0).toFixed(2)} €
      </TableCell>
      {showActions && (
        <TableCell>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={() => setEditingCampaign(c)}>Editar</Button>
            {c.status !== 'active' && c.status !== 'rejected' && (
              <Button size="sm" variant="ghost" className="text-green-600" onClick={() => approve(c.id)}>
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            )}
            {c.status !== 'rejected' && (
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => reject(c.id)}>
                <XCircle className="h-4 w-4" />
              </Button>
            )}
            {c.status === 'active' && (
              <Button size="sm" variant="ghost" onClick={() => toggleActive(c)}>Desactivar</Button>
            )}
          </div>
        </TableCell>
      )}
    </TableRow>
  );

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" /> Publicidad
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestión de campañas, solicitudes externas y métricas
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={expireOld}>
            <RefreshCw className="h-4 w-4 mr-2" /> Expirar antiguas
          </Button>
          <Button size="sm" onClick={() => setCreatingYusiop(true)}>
            <Plus className="h-4 w-4 mr-2" /> Nueva campaña YUSIOP
          </Button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Activas</p>
          <p className="text-2xl font-bold">{active.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Pendientes</p>
          <p className="text-2xl font-bold">{pending.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Impresiones</p>
          <p className="text-2xl font-bold">{totalImpressions.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">CTR</p>
          <p className="text-2xl font-bold">{ctr.toFixed(2)}%</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Ingresos</p>
          <p className="text-2xl font-bold">{totalRevenueEur.toFixed(0)} €</p>
        </CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="active">Activas ({active.length})</TabsTrigger>
          <TabsTrigger value="pending">Pendientes ({pending.length})</TabsTrigger>
          <TabsTrigger value="requests">Solicitudes {newRequests > 0 && <Badge variant="destructive" className="ml-2 h-5 px-1.5">{newRequests}</Badge>}</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
          <TabsTrigger value="stats">Estadísticas</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card>
            <CardContent className="p-0">
              {loading ? <div className="p-8 text-center text-muted-foreground">Cargando…</div> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaña</TableHead><TableHead>Tipo</TableHead>
                      <TableHead>Estado</TableHead><TableHead>Fechas</TableHead>
                      <TableHead>Métricas</TableHead><TableHead>Precio</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {active.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Sin campañas activas
                      </TableCell></TableRow>
                    ) : active.map((c) => <CampaignRow key={c.id} c={c} />)}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaña</TableHead><TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead><TableHead>Fechas</TableHead>
                    <TableHead>Métricas</TableHead><TableHead>Precio</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No hay campañas pendientes
                    </TableCell></TableRow>
                  ) : pending.map((c) => <CampaignRow key={c.id} c={c} />)}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Solicitante</TableHead><TableHead>Contacto</TableHead>
                    <TableHead>Tipo</TableHead><TableHead>Sector</TableHead>
                    <TableHead>Presupuesto</TableHead><TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Sin solicitudes
                    </TableCell></TableRow>
                  ) : requests.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{r.company_name || r.name}</p>
                        {r.company_name && <p className="text-xs text-muted-foreground">{r.name}</p>}
                      </TableCell>
                      <TableCell className="text-xs">
                        <a href={`mailto:${r.email}`} className="text-primary hover:underline flex items-center gap-1">
                          <Mail className="h-3 w-3" />{r.email}
                        </a>
                        {r.phone && <p className="text-muted-foreground">{r.phone}</p>}
                      </TableCell>
                      <TableCell className="text-xs">{r.ad_type}</TableCell>
                      <TableCell className="text-xs">{r.sector ?? '—'}</TableCell>
                      <TableCell className="text-xs">{r.budget ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={REQ_STATUS_BADGE[r.status].variant}>
                          {REQ_STATUS_BADGE[r.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select value={r.status} onValueChange={(v) => updateRequestStatus(r.id, v as any)}>
                          <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">Nueva</SelectItem>
                            <SelectItem value="contacted">Contactada</SelectItem>
                            <SelectItem value="proposal_sent">Propuesta enviada</SelectItem>
                            <SelectItem value="converted">Convertida</SelectItem>
                            <SelectItem value="rejected">Rechazada</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaña</TableHead><TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead><TableHead>Fechas</TableHead>
                    <TableHead>Métricas</TableHead><TableHead>Precio</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((c) => <CampaignRow key={c.id} c={c} />)}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Top campañas por clics</CardTitle></CardHeader>
              <CardContent>
                {[...campaigns].sort((a, b) => b.clicks - a.clicks).slice(0, 5).map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="text-sm truncate flex-1">{c.title}</span>
                    <span className="text-xs font-medium ml-2">{c.clicks} clics</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Ingresos por tipo</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(['artist_release', 'external_business', 'yusiop_service'] as CampaignType[]).map((t) => {
                  const sum = campaigns
                    .filter((c) => c.campaign_type === t && c.payment_status === 'paid')
                    .reduce((a, c) => a + Number(c.price_eur ?? 0), 0);
                  const label = t === 'artist_release' ? 'Artistas' : t === 'external_business' ? 'Empresas' : 'YUSIOP';
                  return (
                    <div key={t} className="flex items-center justify-between">
                      <span className="text-sm">{label}</span>
                      <span className="text-sm font-bold">{sum.toFixed(2)} €</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {editingCampaign && (
        <EditCampaignDialog
          campaign={editingCampaign}
          onClose={() => setEditingCampaign(null)}
          onSaved={() => { setEditingCampaign(null); load(); }}
        />
      )}

      {creatingYusiop && (
        <CreateYusiopDialog
          onClose={() => setCreatingYusiop(false)}
          onCreated={() => { setCreatingYusiop(false); load(); }}
        />
      )}
    </div>
  );
};

// ----- Edit Campaign -----
const EditCampaignDialog = ({ campaign, onClose, onSaved }: {
  campaign: Campaign; onClose: () => void; onSaved: () => void;
}) => {
  const [form, setForm] = useState({
    title: campaign.title,
    subtitle: campaign.subtitle ?? '',
    image_url: campaign.image_url ?? '',
    cta_text: campaign.cta_text ?? '',
    cta_url: campaign.cta_url ?? '',
    start_date: campaign.start_date?.slice(0, 10) ?? '',
    end_date: campaign.end_date?.slice(0, 10) ?? '',
    priority: campaign.priority,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from('ad_campaigns').update({
      title: form.title,
      subtitle: form.subtitle || null,
      image_url: form.image_url || null,
      cta_text: form.cta_text || null,
      cta_url: form.cta_url || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      priority: form.priority,
    }).eq('id', campaign.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Campaña actualizada');
    onSaved();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Editar campaña</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Subtítulo</Label><Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></div>
          <div><Label>URL imagen</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>CTA texto</Label><Input value={form.cta_text} onChange={(e) => setForm({ ...form, cta_text: e.target.value })} /></div>
            <div><Label>CTA URL</Label><Input value={form.cta_url} onChange={(e) => setForm({ ...form, cta_url: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Inicio</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
            <div><Label>Fin</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
          </div>
          <div><Label>Prioridad</Label><Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ----- Create YUSIOP campaign (free) -----
const CreateYusiopDialog = ({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) => {
  const [form, setForm] = useState({
    title: '', subtitle: '', image_url: '', cta_text: 'Saber más', cta_url: '/',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    priority: 0,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.title.trim()) return toast.error('El título es obligatorio');
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('ad_campaigns').insert({
      user_id: user?.id,
      title: form.title,
      subtitle: form.subtitle || null,
      image_url: form.image_url || null,
      cta_text: form.cta_text || null,
      cta_url: form.cta_url || null,
      campaign_type: 'yusiop_service',
      status: 'active',
      payment_status: 'paid',
      price_eur: 0, price_xaf: 0,
      start_date: form.start_date,
      end_date: form.end_date,
      priority: form.priority,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Campaña YUSIOP creada');
    onCreated();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva campaña YUSIOP</DialogTitle>
          <DialogDescription>Campañas internas sin pago, mostradas cuando hay hueco.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Promociona tu música" /></div>
          <div><Label>Subtítulo</Label><Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="Llega a más oyentes" /></div>
          <div><Label>URL imagen</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://…" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>CTA texto</Label><Input value={form.cta_text} onChange={(e) => setForm({ ...form, cta_text: e.target.value })} /></div>
            <div><Label>CTA URL</Label><Input value={form.cta_url} onChange={(e) => setForm({ ...form, cta_url: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Inicio</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
            <div><Label>Fin</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
          </div>
          <div><Label>Prioridad</Label><Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Crear</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Advertising;
