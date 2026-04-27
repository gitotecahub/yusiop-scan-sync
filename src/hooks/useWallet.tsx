import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

export type WalletTxType = 'recharge' | 'purchase' | 'refund' | 'bonus' | 'adjustment';
export type WalletTxStatus = 'pending' | 'completed' | 'failed' | 'reversed';

export interface WalletState {
  id: string;
  balance: number;
  currency: string;
  total_recharged: number;
  total_spent: number;
  updated_at: string;
  /** Descargas estimadas calculadas en backend (floor(balance / value_per_download_xaf)) */
  estimated_downloads: number;
  /** Precio por descarga configurado en admin_financial_settings (XAF) */
  value_per_download_xaf: number;
}

export interface WalletTransaction {
  id: string;
  type: WalletTxType;
  amount: number;
  balance_after: number;
  status: WalletTxStatus;
  reference: string | null;
  payment_method: string | null;
  description: string | null;
  created_at: string;
}

export interface ActiveSubscriptionInfo {
  id: string;
  plan_code: string;
  plan_name: string;
  downloads_remaining: number;
  monthly_downloads: number;
  current_period_end: string;
  cancel_at_period_end: boolean;
  status: string;
}

interface UseWalletResult {
  wallet: WalletState | null;
  transactions: WalletTransaction[];
  subscription: ActiveSubscriptionInfo | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  redeemCode: (code: string) => Promise<{ success: boolean; error?: string; amount?: number; new_balance?: number }>;
}

export function useWallet(): UseWalletResult {
  const { user } = useAuthStore();
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [subscription, setSubscription] = useState<ActiveSubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setWallet(null);
      setTransactions([]);
      setSubscription(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcErr } = await supabase.rpc('get_wallet_summary', { p_limit: 50 });
      if (rpcErr) throw rpcErr;
      const payload = data as any;
      if (payload?.error) throw new Error(payload.error);
      setWallet({
        id: payload.wallet.id,
        balance: Number(payload.wallet.balance),
        currency: payload.wallet.currency ?? 'XAF',
        total_recharged: Number(payload.wallet.total_recharged ?? 0),
        total_spent: Number(payload.wallet.total_spent ?? 0),
        updated_at: payload.wallet.updated_at,
        estimated_downloads: Number(payload.wallet.estimated_downloads ?? 0),
        value_per_download_xaf: Number(payload.wallet.value_per_download_xaf ?? 650),
      });
      setTransactions(
        (payload.transactions ?? []).map((t: any) => ({
          ...t,
          amount: Number(t.amount),
          balance_after: Number(t.balance_after),
        })),
      );
      setSubscription(
        payload.subscription
          ? {
              id: payload.subscription.id,
              plan_code: payload.subscription.plan_code,
              plan_name: payload.subscription.plan_name,
              downloads_remaining: Number(payload.subscription.downloads_remaining ?? 0),
              monthly_downloads: Number(payload.subscription.monthly_downloads ?? 0),
              current_period_end: payload.subscription.current_period_end,
              cancel_at_period_end: !!payload.subscription.cancel_at_period_end,
              status: payload.subscription.status,
            }
          : null,
      );
    } catch (e: any) {
      setError(e.message ?? 'Error cargando wallet');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const redeemCode = useCallback(
    async (code: string) => {
      const { data, error: rpcErr } = await supabase.rpc('redeem_recharge_card', { p_code: code });
      if (rpcErr) return { success: false, error: rpcErr.message };
      const payload = data as any;
      if (!payload?.success) return { success: false, error: payload?.error ?? 'unknown_error' };
      await refresh();
      return {
        success: true,
        amount: Number(payload.amount),
        new_balance: Number(payload.new_balance),
      };
    },
    [refresh],
  );

  return { wallet, transactions, subscription, loading, error, refresh, redeemCode };
}
}
