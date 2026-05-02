import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, Crown, Zap, Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionVisibility } from '@/hooks/useSubscriptionVisibility';
import { useSubscriptionPlans, useMySubscription, type SubscriptionPlan } from '@/hooks/useSubscriptionPlans';
import { formatXAFFixed, formatEURNumber } from '@/lib/currency';
import { formatPriceFromEur } from '@/lib/localizedPricing';
import { cn } from '@/lib/utils';

const planIcon = (code: string) => {
  if (code === 'elite') return Crown;
  if (code === 'pro') return Sparkles;
  return Zap;
};

const planGradient = (code: string) =>
  code === 'elite'
    ? 'from-[hsl(280_85%_45%)] via-[hsl(250_95%_45%)] to-[hsl(188_85%_45%)]'
    : code === 'pro'
      ? 'from-[hsl(250_95%_45%)] via-[hsl(220_90%_45%)] to-[hsl(188_85%_45%)]'
      : 'from-[hsl(220_85%_35%)] via-[hsl(232_80%_40%)] to-[hsl(188_75%_40%)]';

const Subscriptions = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { visible, loading: visLoading } = useSubscriptionVisibility();
  const { plans, loading: plansLoading } = useSubscriptionPlans();
  const { subscription, loading: subLoading, refresh } = useMySubscription();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Toast de retorno desde Stripe
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get('status');
    if (status === 'success') {
      toast.success('🎉 ¡Suscripción activada! Tus descargas ya están disponibles.', { duration: 4000 });
      refresh();
      navigate('/subscriptions', { replace: true });
    } else if (status === 'cancelled') {
      toast.info('Suscripción cancelada antes de pagar.');
      navigate('/subscriptions', { replace: true });
    }
  }, [location.search, navigate, refresh]);

  // Si la suscripción no está activa para este usuario → fuera
  useEffect(() => {
    if (!visLoading && !visible) {
      navigate('/', { replace: true });
    }
  }, [visLoading, visible, navigate]);

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (subscription) {
      toast.info('Ya tienes una suscripción activa.');
      return;
    }
    setCheckoutLoading(plan.code);
    try {
      const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {
        body: { plan_code: plan.code },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No se recibió URL de pago');
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? 'No se pudo iniciar el pago');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm('¿Cancelar suscripción? Mantendrás acceso hasta el fin del ciclo.')) return;
    setCancelling(true);
    try {
      const { data, error } = await supabase.functions.invoke('cancel-subscription');
      if (error) throw error;
      toast.success(data?.message ?? 'Suscripción cancelada.');
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo cancelar');
    } finally {
      setCancelling(false);
    }
  };

  if (visLoading || plansLoading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 px-4 pt-6 max-w-3xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Volver
      </button>

      <header className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary/20 via-purple-500/20 to-cyan-500/20 border border-primary/30 mb-4">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium tracking-wide">YUSIOP Premium</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-purple-400 to-cyan-400 bg-clip-text text-transparent leading-tight">
          Suscríbete y descarga cada mes
        </h1>
        <p className="text-sm text-muted-foreground mt-4 max-w-md mx-auto leading-relaxed">
          Las suscripciones complementan tu tarjeta. Lanzamientos premium siguen disponibles solo con tarjetas QR.
        </p>
      </header>

      {subscription && subscription.plan && (
        <Card className="mb-6 border-primary/40 bg-gradient-to-br from-primary/10 via-purple-500/5 to-cyan-500/10">
          <CardContent className="pt-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Badge className="mb-2 bg-primary text-primary-foreground">Plan activo</Badge>
                <h3 className="text-lg font-semibold">{subscription.plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {subscription.downloads_remaining} / {subscription.monthly_downloads} descargas restantes este mes
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Renueva el {new Date(subscription.current_period_end).toLocaleDateString()}
                  {subscription.cancel_at_period_end && ' · Cancelada (acceso hasta esa fecha)'}
                </p>
              </div>
              {!subscription.cancel_at_period_end && (
                <Button variant="outline" size="sm" onClick={handleCancel} disabled={cancelling}>
                  {cancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Cancelar'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {plans.map((plan) => {
          const Icon = planIcon(plan.code);
          const isMine = subscription?.plan_id === plan.id;
          return (
            <Card
              key={plan.id}
              className={cn(
                'relative overflow-hidden border-2 transition-all',
                plan.is_recommended ? 'border-primary scale-[1.02] shadow-lg shadow-primary/20' : 'border-border',
              )}
            >
              {plan.is_recommended && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-primary via-purple-500 to-cyan-500 text-white text-[10px] font-semibold py-1 text-center uppercase tracking-wider">
                  Recomendado
                </div>
              )}
              <div className={cn('h-1.5 w-full bg-gradient-to-r', planGradient(plan.code))} />
              <CardContent className={cn('pt-6 space-y-4', plan.is_recommended && 'pt-8')}>
                <div className="flex items-center gap-2">
                  <div className={cn('p-2 rounded-lg bg-gradient-to-br text-white', planGradient(plan.code))}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold text-base">{plan.name}</h3>
                </div>

                <div className="space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold tabular-nums">{formatPriceFromEur(plan.price_eur_cents / 100)}</span>
                    <span className="text-xs text-muted-foreground">/mes</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground tabular-nums">{formatEURNumber(plan.price_eur_cents / 100)}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{plan.description}</p>
                </div>

                <div className="space-y-2 pt-3 border-t border-border/50">
                  <div className="flex items-center gap-2 text-sm leading-relaxed">
                    <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    <span><strong>{plan.monthly_downloads}</strong> canciones/mes</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm leading-relaxed">
                    <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    <span>Catálogo base completo</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm leading-relaxed">
                    <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    <span>Descarga inmediata</span>
                  </div>
                  {plan.code === 'elite' && (
                    <div className="flex items-center gap-2 text-sm leading-relaxed">
                      <Zap className="h-3.5 w-3.5 flex-shrink-0 fill-[hsl(265,85%,60%)] text-[hsl(265,85%,60%)]" />
                      <span className="font-medium bg-gradient-to-r from-[hsl(220,90%,65%)] via-[hsl(265,85%,70%)] to-[hsl(180,80%,55%)] bg-clip-text text-transparent">
                        Acceso prioritario a lanzamientos
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm leading-relaxed">
                    <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    <span>Cancela cuando quieras</span>
                  </div>
                </div>

                <Button
                  className={cn(
                    'w-full',
                    plan.is_recommended && 'bg-gradient-to-r from-primary via-purple-500 to-cyan-500 hover:opacity-90',
                  )}
                  variant={plan.is_recommended ? 'default' : 'outline'}
                  onClick={() => handleSubscribe(plan)}
                  disabled={checkoutLoading !== null || isMine || !!subscription}
                >
                  {checkoutLoading === plan.code ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isMine ? (
                    'Tu plan actual'
                  ) : subscription ? (
                    'Cambia desde tu plan'
                  ) : (
                    'Suscribirme'
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6 border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-5 flex gap-3">
          <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong className="text-foreground">Lanzamientos exclusivos:</strong> los nuevos drops premium siguen disponibles solo con tarjetas QR.</p>
            <p>Las descargas <strong>no son acumulables</strong>: se reinician al inicio de cada ciclo mensual.</p>
            <p>Si superas tu límite, podrás <strong>comprar una tarjeta</strong> para seguir descargando.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Subscriptions;
