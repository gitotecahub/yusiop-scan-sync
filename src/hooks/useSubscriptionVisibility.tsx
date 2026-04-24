import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type SubscriptionVisibilityState = 'off' | 'soft_launch' | 'on';

export interface SubscriptionVisibility {
  visible: boolean;
  state: SubscriptionVisibilityState;
  reason: string;
  loading: boolean;
}

/**
 * Hook que comprueba si el usuario actual debe ver la UI de suscripciones.
 * Combina feature flag global + whitelist + reglas básicas (en server).
 */
export function useSubscriptionVisibility(): SubscriptionVisibility {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionVisibility>({
    visible: false,
    state: 'off',
    reason: 'loading',
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data, error } = await supabase.rpc('get_subscription_visibility', {
          _user_id: user?.id ?? null,
        });
        if (cancelled) return;
        if (error || !data || data.length === 0) {
          setState({ visible: false, state: 'off', reason: 'error', loading: false });
          return;
        }
        const row = data[0];
        setState({
          visible: !!row.visible,
          state: (row.state ?? 'off') as SubscriptionVisibilityState,
          reason: row.reason ?? '',
          loading: false,
        });
      } catch (e) {
        if (!cancelled) {
          setState({ visible: false, state: 'off', reason: 'error', loading: false });
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  return state;
}
