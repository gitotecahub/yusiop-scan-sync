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

export const fetchRevenueSeries = async (range: RangeKey) => {
  const start = startDateFor(range);
  const { data, error } = await supabase
    .from('card_purchases')
    .select('amount_cents, created_at, status')
    .eq('status', 'paid')
    .gte('created_at', start.toISOString());
  if (error) throw error;

  const grouped = new Map<string, number>();
  let totalCents = 0;
  let count = 0;
  (data ?? []).forEach((p) => {
    const day = formatDay(new Date(p.created_at));
    grouped.set(day, (grouped.get(day) ?? 0) + (p.amount_cents ?? 0));
    totalCents += p.amount_cents ?? 0;
    count += 1;
  });

  const series = buildDailySeries(
    start,
    Array.from(grouped.entries()).map(([day, value]) => ({ day, value: value / 100 })),
  );

  return {
    series,
    totalEur: totalCents / 100,
    count,
    avgTicketEur: count > 0 ? totalCents / count / 100 : 0,
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
