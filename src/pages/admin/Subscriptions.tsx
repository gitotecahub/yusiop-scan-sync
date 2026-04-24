import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, Trash2, Plus, Users, TrendingUp, Coins, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type State = 'off' | 'soft_launch' | 'on';

interface Flag {
  key: string;
  enabled_state: State;
  whitelist_user_ids: string[];
  rules: {
    min_downloads: number | null;
    active_in_last_days: number | null;
    show_to_users_without_credits: boolean;
    countries: string[];
  };
  updated_at: string;
}

interface Plan {
  id: string;
  code: string;
  name: string;
  monthly_downloads: number;
  price_xaf: number;
  price_eur_cents: number;
  is_recommended: boolean;
  is_active: boolean;
}

interface Metrics {
  active_subscribers: number;
  total_users: number;
  conversion_rate: number;
  monthly_revenue_xaf: number;
  no_credit_attempts_30d: number;
  by_plan: Array<{ plan_code: string; plan_name: string; subscribers: number; revenue_xaf: number }>;
}

const Subscriptions = () => {
  const [flag, setFlag] = useState<Flag | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newWhitelistEmail, setNewWhitelistEmail] = useState('');

  const load = async () => {
    setLoading(true);
    const [flagRes, plansRes, metricsRes] = await Promise.all([
      supabase.from('feature_flags').select('*').eq('key', 'subscriptions').maybeSingle(),
      supabase.from('subscription_plans').select('*').order('display_order'),
      supabase.rpc('subscription_metrics'),
    ]);
    setFlag(flagRes.data as unknown as Flag | null);
    setPlans((plansRes.data ?? []) as Plan[]);
    if (metricsRes.data && !(metricsRes.data as any).error) {
      setMetrics(metricsRes.data as unknown as Metrics);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateFlag = async (patch: Partial<Flag>) => {
    if (!flag) return;
    setSaving(true);
    const { error } = await supabase
      .from('feature_flags')
      .update({
        enabled_state: patch.enabled_state ?? flag.enabled_state,
        whitelist_user_ids: patch.whitelist_user_ids ?? flag.whitelist_user_ids,
        rules: patch.rules ?? flag.rules,
        updated_at: new Date().toISOString(),
      })
      .eq('key', 'subscriptions');
    setSaving(false);
    if (error) {
      toast.error('Error guardando: ' + error.message);
    } else {
      toast.success('Configuración actualizada');
      load();
    }
  };

  const addToWhitelist = async () => {
    if (!flag || !newWhitelistEmail.trim()) return;
    const email = newWhitelistEmail.trim().toLowerCase();

    const { data: userId, error } = await supabase.rpc('get_user_id_by_email', { p_email: email });
    if (error || !userId) {
      toast.error('Usuario no encontrado');
      return;
    }
    if (flag.whitelist_user_ids.includes(userId as unknown as string)) {
      toast.info('Ya está en la lista');
      return;
    }
    await updateFlag({
      whitelist_user_ids: [...flag.whitelist_user_ids, userId as unknown as string],
    });
    setNewWhitelistEmail('');
  };

  const removeFromWhitelist = (userId: string) => {
    if (!flag) return;
    updateFlag({ whitelist_user_ids: flag.whitelist_user_ids.filter((u) => u !== userId) });
  };

  const updatePlanPrice = async (planId: string, priceXaf: number, priceEurCents: number) => {
    const { error } = await supabase
      .from('subscription_plans')
      .update({ price_xaf: priceXaf, price_eur_cents: priceEurCents })
      .eq('id', planId);
    if (error) toast.error(error.message);
    else { toast.success('Precio actualizado'); load(); }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" /> Suscripciones
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Control de visibilidad, segmentación y métricas del sistema de suscripciones.
        </p>
      </header>

      {/* Métricas */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="pt-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" /> Suscriptores activos</div>
            <p className="text-2xl font-bold mt-1">{metrics.active_subscribers}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><TrendingUp className="h-3.5 w-3.5" /> Conversión</div>
            <p className="text-2xl font-bold mt-1">{metrics.conversion_rate}%</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Coins className="h-3.5 w-3.5" /> MRR (XAF)</div>
            <p className="text-2xl font-bold mt-1 tabular-nums">{metrics.monthly_revenue_xaf.toLocaleString('es-ES')}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><AlertTriangle className="h-3.5 w-3.5" /> Sin saldo (30d)</div>
            <p className="text-2xl font-bold mt-1">{metrics.no_credit_attempts_30d}</p>
          </CardContent></Card>
        </div>
      )}

      {/* Estado global */}
      {flag && (
        <Card>
          <CardHeader><CardTitle>Estado global</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Label className="w-32">Visibilidad:</Label>
              <Select
                value={flag.enabled_state}
                onValueChange={(v) => updateFlag({ enabled_state: v as State })}
                disabled={saving}
              >
                <SelectTrigger className="max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">OFF · Oculto para todos</SelectItem>
                  <SelectItem value="soft_launch">SOFT LAUNCH · Solo segmentos</SelectItem>
                  <SelectItem value="on">ON · Visible para todos</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant={flag.enabled_state === 'on' ? 'default' : flag.enabled_state === 'soft_launch' ? 'secondary' : 'outline'}>
                {flag.enabled_state.toUpperCase()}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reglas + whitelist */}
      {flag && flag.enabled_state === 'soft_launch' && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">Reglas básicas</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Descargas mínimas</Label>
                  <Input
                    type="number"
                    placeholder="Ej: 5 (vacío = no aplicar)"
                    value={flag.rules.min_downloads ?? ''}
                    onChange={(e) => updateFlag({
                      rules: { ...flag.rules, min_downloads: e.target.value ? parseInt(e.target.value, 10) : null },
                    })}
                  />
                </div>
                <div>
                  <Label>Activo en últimos N días</Label>
                  <Input
                    type="number"
                    placeholder="Ej: 7 (vacío = no aplicar)"
                    value={flag.rules.active_in_last_days ?? ''}
                    onChange={(e) => updateFlag({
                      rules: { ...flag.rules, active_in_last_days: e.target.value ? parseInt(e.target.value, 10) : null },
                    })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <Label className="font-medium">Mostrar a usuarios sin saldo</Label>
                  <p className="text-xs text-muted-foreground">Usuarios que han intentado descargar sin créditos en 30 días.</p>
                </div>
                <Switch
                  checked={flag.rules.show_to_users_without_credits}
                  onCheckedChange={(v) => updateFlag({
                    rules: { ...flag.rules, show_to_users_without_credits: v },
                  })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Whitelist manual</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="email@usuario.com"
                  value={newWhitelistEmail}
                  onChange={(e) => setNewWhitelistEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addToWhitelist()}
                />
                <Button onClick={addToWhitelist} disabled={saving}>
                  <Plus className="h-4 w-4 mr-1" /> Añadir
                </Button>
              </div>
              {flag.whitelist_user_ids.length === 0 ? (
                <p className="text-xs text-muted-foreground">Ningún usuario en la whitelist.</p>
              ) : (
                <ul className="space-y-1">
                  {flag.whitelist_user_ids.map((id) => (
                    <li key={id} className="flex items-center justify-between text-xs font-mono bg-muted/40 rounded px-2 py-1">
                      <span className="truncate">{id}</span>
                      <button onClick={() => removeFromWhitelist(id)} className="text-destructive hover:text-destructive/80">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Planes */}
      <Card>
        <CardHeader><CardTitle className="text-base">Planes y precios</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {plans.map((p) => (
            <PlanRow key={p.id} plan={p} onSave={updatePlanPrice} />
          ))}
        </CardContent>
      </Card>

      {metrics && metrics.by_plan.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Distribución por plan</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.by_plan.map((p) => (
                <div key={p.plan_code} className="flex justify-between items-center text-sm border-b border-border/40 pb-2">
                  <span>{p.plan_name}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {p.subscribers} usuarios · {p.revenue_xaf.toLocaleString('es-ES')} XAF
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const PlanRow = ({ plan, onSave }: { plan: Plan; onSave: (id: string, xaf: number, eur: number) => void }) => {
  const [xaf, setXaf] = useState(plan.price_xaf);
  const [eur, setEur] = useState(plan.price_eur_cents);
  const dirty = xaf !== plan.price_xaf || eur !== plan.price_eur_cents;
  return (
    <div className="flex items-center gap-3 text-sm border-b border-border/40 pb-3">
      <div className="flex-1">
        <p className="font-medium">{plan.name} <span className="text-xs text-muted-foreground">({plan.monthly_downloads} desc/mes)</span></p>
      </div>
      <div className="flex items-center gap-1">
        <Input className="w-24" type="number" value={xaf} onChange={(e) => setXaf(parseInt(e.target.value, 10) || 0)} />
        <span className="text-xs text-muted-foreground">XAF</span>
      </div>
      <div className="flex items-center gap-1">
        <Input className="w-20" type="number" value={eur} onChange={(e) => setEur(parseInt(e.target.value, 10) || 0)} />
        <span className="text-xs text-muted-foreground">€¢</span>
      </div>
      <Button size="sm" disabled={!dirty} onClick={() => onSave(plan.id, xaf, eur)}>
        Guardar
      </Button>
    </div>
  );
};

export default Subscriptions;
