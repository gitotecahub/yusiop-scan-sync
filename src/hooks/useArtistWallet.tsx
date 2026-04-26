import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

export type WalletSummary = {
  pending_xaf: number;
  available_xaf: number;
  under_review_xaf: number;
  blocked_xaf: number;
  withdrawn_xaf: number;
  gross_total_xaf: number;
  reserved_xaf: number;
  earnings_count: number;
};

export type FinancialSettings = {
  artist_percentage: number;
  value_per_download_xaf: number;
  withdrawal_minimum_xaf: number;
  withdrawal_frequency_days: number;
  validation_period_days: number;
  withdrawal_fee_type: 'none' | 'fixed' | 'percent';
  withdrawal_fee_value: number;
  withdrawals_enabled: boolean;
};

const EMPTY_SUMMARY: WalletSummary = {
  pending_xaf: 0,
  available_xaf: 0,
  under_review_xaf: 0,
  blocked_xaf: 0,
  withdrawn_xaf: 0,
  gross_total_xaf: 0,
  reserved_xaf: 0,
  earnings_count: 0,
};

export const useArtistWallet = () => {
  const { user } = useAuthStore();
  const [artistId, setArtistId] = useState<string | null>(null);
  const [summary, setSummary] = useState<WalletSummary>(EMPTY_SUMMARY);
  const [settings, setSettings] = useState<FinancialSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Get artist linked to user
      const { data: artistRow } = await supabase
        .from('artist_requests')
        .select('artist_name')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .order('reviewed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!artistRow?.artist_name) {
        setLoading(false);
        return;
      }

      const { data: artist } = await supabase
        .from('artists')
        .select('id')
        .eq('name', artistRow.artist_name)
        .maybeSingle();

      if (!artist?.id) {
        setLoading(false);
        return;
      }

      setArtistId(artist.id);

      const [summaryRes, settingsRes] = await Promise.all([
        supabase.rpc('get_artist_wallet_summary', { p_artist_id: artist.id }),
        supabase.rpc('get_public_financial_settings'),
      ]);

      if (summaryRes.data) setSummary(summaryRes.data as unknown as WalletSummary);
      if (settingsRes.data) setSettings(settingsRes.data as unknown as FinancialSettings);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const trulyAvailable = Math.max(0, summary.available_xaf - summary.reserved_xaf);

  return { artistId, summary, settings, loading, reload: load, trulyAvailable };
};
