import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Search, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type Status = 'all' | 'active' | 'cancelled' | 'expired' | 'past_due';

interface ActiveSub {
  id: string;
  user_id: string;
  status: string;
  cancel_at_period_end: boolean;
  current_period_start: string;
  current_period_end: string;
  cancelled_at: string | null;
  monthly_downloads: number;
  downloads_remaining: number;
  stripe_subscription_id: string | null;
  created_at: string;
  plan: { name: string; code: string; price_eur_cents: number } | null;
  user_email?: string | null;
  user_name?: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Activa',
  cancelled: 'Cancelada',
  expired: 'Expirada',
  past_due: 'Vencida',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  active: 'default',
  cancelled: 'secondary',
  expired: 'outline',
  past_due: 'destructive',
};

const ActiveSubscriptionsList = () => {
  const [subs, setSubs] = useState<ActiveSub[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Status>('active');
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState<{ sub: ActiveSub; mode: 'period_end' | 'immediate' } | null>(null);
  const [acting, setActing] = useState(false);

  const load = async () => {
    setLoading(true);
    let query = supabase
      .from('user_subscriptions')
      .select(`
        id, user_id, status, cancel_at_period_end, current_period_start, current_period_end,
        cancelled_at, monthly_downloads, downloads_remaining, stripe_subscription_id, created_at,
        plan:subscription_plans!user_subscriptions_plan_id_fkey ( name, code, price_eur_cents )
      `)
      .order('created_at', { ascending: false })
      .limit(500);

    if (status !== 'all') query = query.eq('status', status);

    const { data, error } = await query;
    if (error) {
      toast.error('Error cargando suscripciones: ' + error.message);
      setLoading(false);
      return;
    }

    const userIds = Array.from(new Set((data ?? []).map((s: any) => s.user_id)));
    const [usersRes, profilesRes] = await Promise.all([
      userIds.length
        ? supabase.from('users').select('id, email, full_name').in('id', userIds)
        : Promise.resolve({ data: [], error: null } as any),
      userIds.length
        ? supabase.from('profiles').select('user_id, username, full_name').in('user_id', userIds)
        : Promise.resolve({ data: [], error: null } as any),
    ]);

    const usersMap = new Map<string, { email?: string; full_name?: string }>(
      (usersRes.data ?? []).map((u: any) => [u.id, { email: u.email, full_name: u.full_name }])
    );
    const profilesMap = new Map<string, { username?: string; full_name?: string }>(
      (profilesRes.data ?? []).map((p: any) => [p.user_id, { username: p.username, full_name: p.full_name }])
    );

    const enriched: ActiveSub[] = (data ?? []).map((s: any) => ({
      ...s,
      user_email: usersMap.get(s.user_id)?.email ?? null,
      user_name:
        profilesMap.get(s.user_id)?.full_name ??
        profilesMap.get(s.user_id)?.username ??
        usersMap.get(s.user_id)?.full_name ??
        null,
    }));
    setSubs(enriched);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  const filtered = subs.filter((s) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      (s.user_email ?? '').toLowerCase().includes(q) ||
      (s.user_name ?? '').toLowerCase().includes(q) ||
      (s.plan?.name ?? '').toLowerCase().includes(q)
    );
  });

  const handleCancel = async () => {
    if (!confirm) return;
    setActing(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-cancel-subscription', {
        body: { subscription_id: confirm.sub.id, mode: confirm.mode },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? 'No se pudo cancelar');
      toast.success(data.message ?? 'Suscripción cancelada');
      setConfirm(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al cancelar');
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <Tabs value={status} onValueChange={(v) => setStatus(v as Status)}>
          <TabsList>
            <TabsTrigger value="active">Activas</TabsTrigger>
            <TabsTrigger value="cancelled">Canceladas</TabsTrigger>
            <TabsTrigger value="past_due">Vencidas</TabsTrigger>
            <TabsTrigger value="expired">Expiradas</TabsTrigger>
            <TabsTrigger value="all">Todas</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative max-w-xs w-full">
          <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por email, nombre o plan…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="pt-6 text-center text-sm text-muted-foreground">
          No hay suscripciones que coincidan.
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <Card key={s.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">
                        {s.user_name ?? s.user_email ?? s.user_id.slice(0, 8)}
                      </span>
                      <Badge variant={STATUS_VARIANT[s.status] ?? 'outline'}>
                        {STATUS_LABEL[s.status] ?? s.status}
                      </Badge>
                      {s.cancel_at_period_end && s.status === 'active' && (
                        <Badge variant="outline" className="gap-1">
                          <Clock className="h-3 w-3" /> cancela al fin del periodo
                        </Badge>
                      )}
                      {s.stripe_subscription_id && (
                        <Badge variant="outline" className="text-[10px]">Stripe</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {s.user_email ?? '—'} · {s.plan?.name ?? 'Plan desconocido'} · {(s.plan?.price_eur_cents ?? 0) / 100} €/mes
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                      Periodo: {new Date(s.current_period_start).toLocaleDateString('es-ES')} → {new Date(s.current_period_end).toLocaleDateString('es-ES')}
                      {' · '}
                      Descargas: {s.downloads_remaining}/{s.monthly_downloads}
                    </p>
                  </div>
                  {s.status === 'active' && (
                    <div className="flex gap-2 shrink-0">
                      {!s.cancel_at_period_end && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setConfirm({ sub: s, mode: 'period_end' })}
                        >
                          <Clock className="h-3.5 w-3.5 mr-1" /> Cancelar al fin
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setConfirm({ sub: s, mode: 'immediate' })}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Cancelar ya
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.mode === 'immediate' ? 'Cancelar inmediatamente' : 'Cancelar al final del periodo'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.mode === 'immediate'
                ? `Se cortará el acceso de ${confirm?.sub.user_email ?? 'este usuario'} de inmediato. Las descargas restantes se pondrán a 0. Si está en Stripe, también se cancelará allí.`
                : `${confirm?.sub.user_email ?? 'El usuario'} mantendrá acceso hasta ${confirm ? new Date(confirm.sub.current_period_end).toLocaleDateString('es-ES') : ''}. No se renovará automáticamente.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting}>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} disabled={acting}>
              {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ActiveSubscriptionsList;
