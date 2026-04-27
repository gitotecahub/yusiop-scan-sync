import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Sparkles, Trash2, Plus, Users, TrendingUp, Coins, AlertTriangle, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import ActiveSubscriptionsList from '@/components/admin/ActiveSubscriptionsList';

type State = 'off' | 'soft_launch' | 'on';

interface RuleHighActivity { enabled: boolean; min_downloads: number }
interface RuleNoCredits { enabled: boolean; days: number }
interface RuleBuyers { enabled: boolean; min_purchases: number; days: number }
interface RuleActiveUsers { enabled: boolean; min_logins: number; days: number }

interface Rules {
  rule_high_activity?: RuleHighActivity;
  rule_no_credits?: RuleNoCredits;
  rule_buyers?: RuleBuyers;
  rule_active_users?: RuleActiveUsers;
}

interface Flag {
  key: string;
  enabled_state: State;
  whitelist_user_ids: string[];
  rules: Rules;
  updated_at: string;
}

interface Plan {
  id: string;
  code: 'plus' | 'pro' | 'elite';
  name: string;
  description: string | null;
  monthly_downloads: number;
  price_xaf: number;
  price_eur_cents: number;
  is_recommended: boolean;
  is_active: boolean;
  display_order: number;
}

interface Metrics {
  active_subscribers: number;
  total_users: number;
  conversion_rate: number;
  monthly_revenue_xaf: number;
  no_credit_attempts_30d: number;
  by_plan: Array<{ plan_code: string; plan_name: string; subscribers: number; revenue_xaf: number }>;
}

const FLAG_KEY = 'subscriptions_visibility';

const DEFAULT_RULES: Required<Rules> = {
  rule_high_activity: { enabled: true, min_downloads: 5 },
  rule_no_credits: { enabled: true, days: 7 },
  rule_buyers: { enabled: true, min_purchases: 2, days: 30 },
  rule_active_users: { enabled: true, min_logins: 3, days: 7 },
};

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
      supabase.from('feature_flags').select('*').eq('key', FLAG_KEY).maybeSingle(),
      supabase.from('subscription_plans').select('*').order('display_order'),
      supabase.rpc('subscription_metrics'),
    ]);
    const raw = flagRes.data as any;
    if (raw) {
      setFlag({
        ...raw,
        rules: { ...DEFAULT_RULES, ...(raw.rules ?? {}) },
      });
    } else {
      setFlag(null);
    }
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
        rules: (patch.rules ?? flag.rules) as any,
        updated_at: new Date().toISOString(),
      })
      .eq('key', FLAG_KEY);
    setSaving(false);
    if (error) {
      toast.error('Error guardando: ' + error.message);
    } else {
      toast.success('Configuración actualizada');
      load();
    }
  };

  const updateRule = <K extends keyof Rules>(key: K, value: Rules[K]) => {
    if (!flag) return;
    updateFlag({ rules: { ...flag.rules, [key]: value } });
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

  const updatePlan = async (planId: string, patch: Partial<Plan>) => {
    const { error } = await supabase
      .from('subscription_plans')
      .update({ ...patch, updated_at: new Date().toISOString() } as any)
      .eq('id', planId);
    if (error) toast.error(error.message);
    else { toast.success('Plan actualizado'); load(); }
  };

  const deletePlan = async (planId: string) => {
    if (!confirm('¿Eliminar este plan? No se podrá recuperar.')) return;
    const { error } = await supabase.from('subscription_plans').delete().eq('id', planId);
    if (error) toast.error(error.message);
    else { toast.success('Plan eliminado'); load(); }
  };

  const createPlan = async () => {
    const code = prompt('Código del plan (plus, pro o elite):')?.trim().toLowerCase();
    if (!code || !['plus', 'pro', 'elite'].includes(code)) {
      toast.error('Código inválido. Usa: plus, pro o elite');
      return;
    }
    const { error } = await supabase.from('subscription_plans').insert({
      code: code as any,
      name: code.charAt(0).toUpperCase() + code.slice(1),
      description: '',
      monthly_downloads: 5,
      price_xaf: 1500,
      price_eur_cents: 299,
      is_active: true,
      is_recommended: false,
      display_order: plans.length,
    } as any);
    if (error) toast.error(error.message);
    else { toast.success('Plan creado'); load(); }
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

      <Tabs defaultValue="config" className="space-y-6">
        <TabsList>
          <TabsTrigger value="config" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Configuración
          </TabsTrigger>
          <TabsTrigger value="active" className="gap-1.5">
            <ListChecks className="h-3.5 w-3.5" /> Activas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <ActiveSubscriptionsList />
        </TabsContent>

        <TabsContent value="config" className="space-y-6">

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

      {/* Reglas SOFT LAUNCH */}
      {flag && flag.enabled_state === 'soft_launch' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Reglas de segmentación</CardTitle>
              <p className="text-xs text-muted-foreground">
                Si un usuario cumple <strong>al menos una</strong> regla activa, verá la suscripción.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Regla 1: Alta actividad */}
              <RuleBlock
                title="Alta actividad"
                description="Usuarios con más de N descargas totales."
                enabled={flag.rules.rule_high_activity?.enabled ?? false}
                onToggle={(v) => updateRule('rule_high_activity', {
                  ...(flag.rules.rule_high_activity ?? DEFAULT_RULES.rule_high_activity),
                  enabled: v,
                })}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <NumberField
                    label="Descargas mínimas"
                    value={flag.rules.rule_high_activity?.min_downloads ?? 5}
                    onSave={(n) => updateRule('rule_high_activity', {
                      enabled: flag.rules.rule_high_activity?.enabled ?? true,
                      min_downloads: n,
                    })}
                  />
                </div>
              </RuleBlock>

              {/* Regla 2: Sin saldo reciente */}
              <RuleBlock
                title="Sin saldo reciente"
                description="Usuarios que han intentado descargar sin créditos."
                enabled={flag.rules.rule_no_credits?.enabled ?? false}
                onToggle={(v) => updateRule('rule_no_credits', {
                  ...(flag.rules.rule_no_credits ?? DEFAULT_RULES.rule_no_credits),
                  enabled: v,
                })}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <NumberField
                    label="En los últimos N días"
                    value={flag.rules.rule_no_credits?.days ?? 7}
                    onSave={(n) => updateRule('rule_no_credits', {
                      enabled: flag.rules.rule_no_credits?.enabled ?? true,
                      days: n,
                    })}
                  />
                </div>
              </RuleBlock>

              {/* Regla 3: Compradores */}
              <RuleBlock
                title="Compradores"
                description="Usuarios que han comprado tarjetas recientemente."
                enabled={flag.rules.rule_buyers?.enabled ?? false}
                onToggle={(v) => updateRule('rule_buyers', {
                  ...(flag.rules.rule_buyers ?? DEFAULT_RULES.rule_buyers),
                  enabled: v,
                })}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <NumberField
                    label="Mínimo de tarjetas"
                    value={flag.rules.rule_buyers?.min_purchases ?? 2}
                    onSave={(n) => updateRule('rule_buyers', {
                      enabled: flag.rules.rule_buyers?.enabled ?? true,
                      days: flag.rules.rule_buyers?.days ?? 30,
                      min_purchases: n,
                    })}
                  />
                  <NumberField
                    label="En los últimos N días"
                    value={flag.rules.rule_buyers?.days ?? 30}
                    onSave={(n) => updateRule('rule_buyers', {
                      enabled: flag.rules.rule_buyers?.enabled ?? true,
                      min_purchases: flag.rules.rule_buyers?.min_purchases ?? 2,
                      days: n,
                    })}
                  />
                </div>
              </RuleBlock>

              {/* Regla 4: Usuarios activos */}
              <RuleBlock
                title="Usuarios activos"
                description="Usuarios con sesiones recurrentes."
                enabled={flag.rules.rule_active_users?.enabled ?? false}
                onToggle={(v) => updateRule('rule_active_users', {
                  ...(flag.rules.rule_active_users ?? DEFAULT_RULES.rule_active_users),
                  enabled: v,
                })}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <NumberField
                    label="Mínimo de inicios de sesión"
                    value={flag.rules.rule_active_users?.min_logins ?? 3}
                    onSave={(n) => updateRule('rule_active_users', {
                      enabled: flag.rules.rule_active_users?.enabled ?? true,
                      days: flag.rules.rule_active_users?.days ?? 7,
                      min_logins: n,
                    })}
                  />
                  <NumberField
                    label="En los últimos N días"
                    value={flag.rules.rule_active_users?.days ?? 7}
                    onSave={(n) => updateRule('rule_active_users', {
                      enabled: flag.rules.rule_active_users?.enabled ?? true,
                      min_logins: flag.rules.rule_active_users?.min_logins ?? 3,
                      days: n,
                    })}
                  />
                </div>
              </RuleBlock>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Whitelist manual</CardTitle>
              <p className="text-xs text-muted-foreground">
                Estos usuarios <strong>siempre</strong> verán la suscripción, aunque no cumplan reglas.
              </p>
            </CardHeader>
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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Planes y precios</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Edita nombre, descripción, descargas/mes, precios y visibilidad de cada plan.
            </p>
          </div>
          <Button size="sm" onClick={createPlan}>
            <Plus className="h-4 w-4 mr-1" /> Nuevo plan
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {plans.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay planes configurados.</p>
          ) : (
            plans.map((p) => (
              <PlanRow key={p.id} plan={p} onSave={updatePlan} onDelete={deletePlan} />
            ))
          )}
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

const RuleBlock = ({
  title,
  description,
  enabled,
  onToggle,
  children,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children: React.ReactNode;
}) => (
  <div className="rounded-lg border border-border p-4 space-y-3">
    <div className="flex items-start justify-between gap-3">
      <div>
        <Label className="font-medium text-sm">{title}</Label>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch checked={enabled} onCheckedChange={onToggle} />
    </div>
    {enabled && <div className="pt-1">{children}</div>}
  </div>
);

const NumberField = ({
  label,
  value,
  onSave,
}: {
  label: string;
  value: number;
  onSave: (n: number) => void;
}) => {
  const [v, setV] = useState(value);
  useEffect(() => { setV(value); }, [value]);
  const dirty = v !== value;
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex gap-1">
        <Input
          type="number"
          min={0}
          value={v}
          onChange={(e) => setV(parseInt(e.target.value, 10) || 0)}
          className="h-9"
        />
        <Button size="sm" disabled={!dirty} onClick={() => onSave(v)} className="h-9">
          OK
        </Button>
      </div>
    </div>
  );
};

const PlanRow = ({
  plan,
  onSave,
  onDelete,
}: {
  plan: Plan;
  onSave: (id: string, patch: Partial<Plan>) => void;
  onDelete: (id: string) => void;
}) => {
  const [name, setName] = useState(plan.name);
  const [description, setDescription] = useState(plan.description ?? '');
  const [downloads, setDownloads] = useState(plan.monthly_downloads);
  const [xaf, setXaf] = useState(plan.price_xaf);
  const [eur, setEur] = useState(plan.price_eur_cents);
  const [order, setOrder] = useState(plan.display_order);
  const [recommended, setRecommended] = useState(plan.is_recommended);
  const [active, setActive] = useState(plan.is_active);

  useEffect(() => {
    setName(plan.name);
    setDescription(plan.description ?? '');
    setDownloads(plan.monthly_downloads);
    setXaf(plan.price_xaf);
    setEur(plan.price_eur_cents);
    setOrder(plan.display_order);
    setRecommended(plan.is_recommended);
    setActive(plan.is_active);
  }, [plan]);

  const dirty =
    name !== plan.name ||
    description !== (plan.description ?? '') ||
    downloads !== plan.monthly_downloads ||
    xaf !== plan.price_xaf ||
    eur !== plan.price_eur_cents ||
    order !== plan.display_order ||
    recommended !== plan.is_recommended ||
    active !== plan.is_active;

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-[10px] uppercase">{plan.code}</Badge>
          {plan.is_recommended && <Badge className="text-[10px]">Recomendado</Badge>}
          {!plan.is_active && <Badge variant="secondary" className="text-[10px]">Inactivo</Badge>}
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={() => onDelete(plan.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Nombre</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Descargas / mes</Label>
          <Input
            type="number"
            min={0}
            value={downloads}
            onChange={(e) => setDownloads(parseInt(e.target.value, 10) || 0)}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Descripción</Label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción visible para el usuario"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Precio (XAF)</Label>
          <Input
            type="number"
            min={0}
            value={xaf}
            onChange={(e) => setXaf(parseInt(e.target.value, 10) || 0)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Precio (€¢)</Label>
          <Input
            type="number"
            min={0}
            value={eur}
            onChange={(e) => setEur(parseInt(e.target.value, 10) || 0)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Orden</Label>
          <Input
            type="number"
            min={0}
            value={order}
            onChange={(e) => setOrder(parseInt(e.target.value, 10) || 0)}
          />
        </div>
      </div>

      <div className="flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2">
          <Switch checked={active} onCheckedChange={setActive} />
          <Label className="text-xs">Activo</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={recommended} onCheckedChange={setRecommended} />
          <Label className="text-xs">Recomendado</Label>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          size="sm"
          disabled={!dirty}
          onClick={() =>
            onSave(plan.id, {
              name,
              description: description.trim() || null,
              monthly_downloads: downloads,
              price_xaf: xaf,
              price_eur_cents: eur,
              display_order: order,
              is_recommended: recommended,
              is_active: active,
            })
          }
        >
          Guardar cambios
        </Button>
      </div>
    </div>
  );
};


export default Subscriptions;
