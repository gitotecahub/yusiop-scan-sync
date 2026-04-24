import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface SubscriptionPlan {
  id: string;
  code: 'plus' | 'pro' | 'elite';
  name: string;
  description: string | null;
  monthly_downloads: number;
  price_xaf: number;
  price_eur_cents: number;
  is_recommended: boolean;
  display_order: number;
  is_active: boolean;
}

export interface ActiveSubscription {
  id: string;
  plan_id: string;
  status: string;
  current_period_end: string;
  downloads_remaining: number;
  monthly_downloads: number;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  plan?: SubscriptionPlan | null;
}

export function useSubscriptionPlans() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (!cancelled) {
        setPlans((data ?? []) as SubscriptionPlan[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { plans, loading };
}

export function useMySubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<ActiveSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('user_subscriptions')
      .select('*, plan:subscription_plans(*)')
      .eq('user_id', user.id)
      .in('status', ['active', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setSubscription((data as ActiveSubscription | null) ?? null);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  return { subscription, loading, refresh };
}
