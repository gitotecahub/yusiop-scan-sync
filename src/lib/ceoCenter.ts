import { supabase } from '@/integrations/supabase/client';

export type CeoPeriod = '1d' | '7d' | '30d' | '90d' | '1y';

export const periodToDays = (p: CeoPeriod): number =>
  p === '1d' ? 1 : p === '7d' ? 7 : p === '30d' ? 30 : p === '90d' ? 90 : 365;

export const periodLabel = (p: CeoPeriod): string =>
  p === '1d' ? 'Hoy' : p === '7d' ? '7 días' : p === '30d' ? '30 días' : p === '90d' ? '90 días' : '1 año';

const callRpc = async <T,>(fn: string, args: Record<string, unknown>): Promise<T> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc(fn, args);
  if (error) throw error;
  return data as T;
};

export interface HealthScore {
  score: number;
  status: 'excellent' | 'stable' | 'attention' | 'risk';
  message: string;
  components: Record<string, number>;
}

export interface CeoKpis {
  period_days: number;
  revenue_total: number;
  revenue_total_prev: number;
  revenue_cards: number;
  revenue_cards_prev: number;
  revenue_subscriptions: number;
  revenue_subscriptions_prev: number;
  revenue_express: number;
  revenue_express_prev: number;
  downloads: number;
  downloads_prev: number;
  active_users: number;
  active_users_prev: number;
  active_artists: number;
  card_count: number;
  avg_ticket: number;
  conversion_rate: number;
  estimated_profit: number;
}

export interface RevenueEngine {
  engine: 'cards' | 'subscriptions' | 'express';
  label: string;
  revenue: number;
  percent: number;
  trend: number | null;
  recommendation: string;
}

export interface TopSong {
  song_id: string;
  title: string;
  artist_name: string;
  downloads_now: number;
  downloads_prev: number;
  growth_pct: number;
  estimated_revenue: number;
  ai_status: 'viral' | 'promote' | 'normal' | 'review';
}

export interface TopArtist {
  artist_id: string;
  name: string;
  active_songs: number;
  downloads_now: number;
  downloads_prev: number;
  growth_pct: number;
  estimated_revenue: number;
  recommendation: 'high_potential' | 'invest' | 'maintain' | 'review';
}

export interface SuspiciousUserItem {
  user_id: string;
  email: string;
  full_name: string | null;
  score: number;
  last_event_at: string;
  notes: string | null;
}

export interface RepeatedIpItem {
  ip_address: string;
  unique_users: number;
  total_downloads: number;
  country_name: string | null;
  city: string | null;
  last_seen: string;
}

export interface CeoAlertData {
  users?: SuspiciousUserItem[];
  ips?: RepeatedIpItem[];
  total?: number;
}

export interface CeoAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  recommendation: string;
  created_at: string;
  data?: CeoAlertData;
}

export interface FraudSummary {
  suspicious_downloads: number;
  repeated_ips: number;
  flagged_users: number;
  avg_fraud_score: number;
  critical_alerts: number;
}

export interface ForecastBucket {
  conservative: number;
  realistic: number;
  optimistic: number;
}
export interface SalesForecast {
  daily_avg: number;
  growth_factor: number;
  forecast_7: ForecastBucket;
  forecast_30: ForecastBucket;
  forecast_90: ForecastBucket;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  difficulty: 'low' | 'medium' | 'high';
  priority: number;
  action: string;
}

export const ceoApi = {
  health: (days: number) => callRpc<HealthScore>('get_ceo_health_score', { p_days: days }),
  kpis: (days: number) => callRpc<CeoKpis>('get_ceo_kpis', { p_days: days }),
  revenue: (days: number) => callRpc<RevenueEngine[]>('get_ceo_revenue_breakdown', { p_days: days }),
  topSongs: (days: number) => callRpc<TopSong[]>('get_ceo_top_songs', { p_days: days, p_limit: 10 }),
  topArtists: (days: number) => callRpc<TopArtist[]>('get_ceo_top_artists', { p_days: days, p_limit: 10 }),
  alerts: (days: number) => callRpc<CeoAlert[]>('get_ceo_ai_alerts', { p_days: days }),
  fraud: (days: number) => callRpc<FraudSummary>('get_ceo_fraud_summary', { p_days: days }),
  forecast: (days: number) => callRpc<SalesForecast>('get_ceo_sales_forecast', { p_days: days }),
  recommendations: (days: number) => callRpc<Recommendation[]>('get_ceo_recommendations', { p_days: days }),
};

export const formatCurrency = (n: number): string =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export const formatNumber = (n: number): string =>
  new Intl.NumberFormat('es-ES').format(n);

export const computeDelta = (now: number, prev: number): number | null => {
  if (!prev || prev === 0) return now > 0 ? 100 : null;
  return ((now - prev) / prev) * 100;
};
