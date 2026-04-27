import { supabase } from '@/integrations/supabase/client';

export type RangeKey = '7d' | '30d' | '90d' | '1y';

export const rangeToDays = (range: RangeKey) =>
  range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365;

export const startDateFor = (range: RangeKey) => {
  const d = new Date();
  d.setDate(d.getDate() - rangeToDays(range));
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const buildDailySeries = <T extends { date: string }>(
  start: Date,
  rows: { day: string; value: number }[],
): { date: string; value: number }[] => {
  const map = new Map(rows.map((r) => [r.day, r.value]));
  const out: { date: string; value: number }[] = [];
  const cursor = new Date(start);
  const end = new Date();
  while (cursor <= end) {
    const key = formatDay(cursor);
    out.push({ date: key, value: map.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
};

// Conversion XAF -> EUR (approx) for Express revenue (Express is priced in XAF)
const XAF_PER_EUR = 655.957;

export type RevenueBreakdown = {
  cards_eur: number;
  cards_count: number;
  express_eur: number;
  express_count: number;
  promo_eur: number;
  promo_count: number;
  subs_eur: number;
  subs_count: number;
};

export const fetchRevenueSeries = async (range: RangeKey) => {
  const start = startDateFor(range);
  const startIso = start.toISOString();

  const [cardsRes, expressRes, promoRes, subsRes] = await Promise.all([
    // 1) Card purchases (EUR cents)
    supabase
      .from('card_purchases')
      .select('amount_cents, created_at, status')
      .eq('status', 'paid')
      .gte('created_at', startIso),
    // 2) Express payments (XAF) on song_submissions
    supabase
      .from('song_submissions')
      .select('express_price_xaf, express_paid_at')
      .not('express_paid_at', 'is', null)
      .gte('express_paid_at', startIso),
    // 3) Promo / artist_release ad campaigns (EUR)
    supabase
      .from('ad_campaigns')
      .select('price_eur, created_at, payment_status, campaign_type')
      .eq('campaign_type', 'artist_release')
      .eq('payment_status', 'paid')
      .gte('created_at', startIso),
    // 4) Active subscriptions started in range (joined with plan price)
    supabase
      .from('user_subscriptions')
      .select('created_at, status, subscription_plans!inner(price_eur_cents)')
      .gte('created_at', startIso)
      .in('status', ['active', 'cancelled', 'past_due']),
  ]);

  if (cardsRes.error) throw cardsRes.error;
  if (expressRes.error) console.warn('[revenue] express error', expressRes.error);
  if (promoRes.error) console.warn('[revenue] promo error', promoRes.error);
  if (subsRes.error) console.warn('[revenue] subs error', subsRes.error);

  const grouped = new Map<string, number>();
  const breakdown: RevenueBreakdown = {
    cards_eur: 0, cards_count: 0,
    express_eur: 0, express_count: 0,
    promo_eur: 0, promo_count: 0,
    subs_eur: 0, subs_count: 0,
  };
  let totalEur = 0;
  let totalCount = 0;

  const addToDay = (dateStr: string, eur: number) => {
    const day = formatDay(new Date(dateStr));
    grouped.set(day, (grouped.get(day) ?? 0) + eur);
  };

  (cardsRes.data ?? []).forEach((p: any) => {
    const eur = (p.amount_cents ?? 0) / 100;
    addToDay(p.created_at, eur);
    breakdown.cards_eur += eur;
    breakdown.cards_count += 1;
    totalEur += eur;
    totalCount += 1;
  });

  (expressRes.data ?? []).forEach((s: any) => {
    const eur = (Number(s.express_price_xaf) || 0) / XAF_PER_EUR;
    if (s.express_paid_at) addToDay(s.express_paid_at, eur);
    breakdown.express_eur += eur;
    breakdown.express_count += 1;
    totalEur += eur;
    totalCount += 1;
  });

  (promoRes.data ?? []).forEach((c: any) => {
    const eur = Number(c.price_eur) || 0;
    addToDay(c.created_at, eur);
    breakdown.promo_eur += eur;
    breakdown.promo_count += 1;
    totalEur += eur;
    totalCount += 1;
  });

  (subsRes.data ?? []).forEach((s: any) => {
    const cents = Number(s.subscription_plans?.price_eur_cents) || 0;
    const eur = cents / 100;
    addToDay(s.created_at, eur);
    breakdown.subs_eur += eur;
    breakdown.subs_count += 1;
    totalEur += eur;
    totalCount += 1;
  });

  const series = buildDailySeries(
    start,
    Array.from(grouped.entries()).map(([day, value]) => ({ day, value })),
  );

  return {
    series,
    totalEur,
    count: totalCount,
    avgTicketEur: totalCount > 0 ? totalEur / totalCount : 0,
    breakdown,
  };
};

export const fetchDownloadsSeries = async (range: RangeKey) => {
  const start = startDateFor(range);
  const { data, error } = await supabase
    .from('user_downloads')
    .select('downloaded_at')
    .gte('downloaded_at', start.toISOString());
  if (error) throw error;

  const grouped = new Map<string, number>();
  (data ?? []).forEach((d) => {
    const day = formatDay(new Date(d.downloaded_at));
    grouped.set(day, (grouped.get(day) ?? 0) + 1);
  });

  const series = buildDailySeries(
    start,
    Array.from(grouped.entries()).map(([day, value]) => ({ day, value })),
  );

  return { series, total: data?.length ?? 0 };
};

export const fetchTopSongs = async (range: RangeKey, limit = 10) => {
  const start = startDateFor(range);
  const { data, error } = await supabase
    .from('user_downloads')
    .select('song_id')
    .gte('downloaded_at', start.toISOString());
  if (error) throw error;

  const counts = new Map<string, number>();
  (data ?? []).forEach((d) => {
    if (!d.song_id) return;
    counts.set(d.song_id, (counts.get(d.song_id) ?? 0) + 1);
  });
  const topIds = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
  if (topIds.length === 0) return [];

  const { data: songs } = await supabase
    .from('songs')
    .select('id, title, artist_id, artists(name)')
    .in('id', topIds.map(([id]) => id));

  return topIds.map(([id, count]) => {
    const song = songs?.find((s: any) => s.id === id);
    return {
      id,
      title: song?.title ?? 'Desconocida',
      artist: (song as any)?.artists?.name ?? '—',
      count,
    };
  });
};

export const fetchQrStats = async () => {
  const { count: total } = await supabase
    .from('qr_cards')
    .select('*', { count: 'exact', head: true });
  const { count: activated } = await supabase
    .from('qr_cards')
    .select('*', { count: 'exact', head: true })
    .eq('is_activated', true);
  const { count: gifts } = await supabase
    .from('qr_cards')
    .select('*', { count: 'exact', head: true })
    .eq('is_gift', true);
  const { count: giftsRedeemed } = await supabase
    .from('qr_cards')
    .select('*', { count: 'exact', head: true })
    .eq('is_gift', true)
    .eq('gift_redeemed', true);

  return {
    total: total ?? 0,
    activated: activated ?? 0,
    activationRate: total ? Math.round(((activated ?? 0) / total) * 100) : 0,
    gifts: gifts ?? 0,
    giftsRedeemed: giftsRedeemed ?? 0,
    giftRedemptionRate: gifts ? Math.round(((giftsRedeemed ?? 0) / gifts) * 100) : 0,
  };
};

export const fetchNewUsers = async (range: RangeKey) => {
  const start = startDateFor(range);
  const { count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', start.toISOString());
  return count ?? 0;
};

// Ingresos brutos de monetización (igual que la página /admin/monetization):
// = créditos consumidos en descargas (valor por descarga según tipo de tarjeta)
//   + ventas de tarjetas físicas activadas (XAF→EUR).
// Se calcula sobre TODO el histórico, igual que la vista de Monetización.
const STANDARD_PRICE_EUR = 5.0;
const STANDARD_CREDITS = 4;
const PREMIUM_PRICE_EUR = 10.0;
const PREMIUM_CREDITS_DEFAULT = 10;
const STANDARD_PER_DOWNLOAD = STANDARD_PRICE_EUR / STANDARD_CREDITS;
const PHYSICAL_STANDARD_PRICE_XAF = 3000;
const PHYSICAL_PREMIUM_PRICE_XAF = 7000;
const XAF_TO_EUR = 655.957;

export const fetchMonetizationGross = async () => {
  const [{ data: dls }, { data: qrs }] = await Promise.all([
    supabase.from('user_downloads').select('song_id, card_type, qr_card_id'),
    supabase.from('qr_cards').select('id, card_type, download_credits, origin, is_activated'),
  ]);
  const qrMap = new Map<string, any>();
  (qrs ?? []).forEach((q: any) => qrMap.set(q.id, q));

  let downloadsGross = 0;
  (dls ?? []).forEach((d: any) => {
    let cardType = d.card_type;
    let credits = 0;
    if (d.qr_card_id) {
      const qr = qrMap.get(d.qr_card_id);
      if (qr) {
        cardType = qr.card_type;
        credits = qr.download_credits > 0 ? qr.download_credits : 0;
      }
    }
    if (cardType === 'premium') {
      const c = credits > 0 ? credits : PREMIUM_CREDITS_DEFAULT;
      downloadsGross += PREMIUM_PRICE_EUR / c;
    } else {
      downloadsGross += STANDARD_PER_DOWNLOAD;
    }
  });

  let physicalXaf = 0;
  qrMap.forEach((qr: any) => {
    if (qr.origin !== 'physical' || !qr.is_activated) return;
    physicalXaf += qr.card_type === 'premium' ? PHYSICAL_PREMIUM_PRICE_XAF : PHYSICAL_STANDARD_PRICE_XAF;
  });
  const physicalEur = physicalXaf / XAF_TO_EUR;

  return {
    downloadsGross,
    physicalSalesEur: physicalEur,
    totalGross: downloadsGross + physicalEur,
  };
};
