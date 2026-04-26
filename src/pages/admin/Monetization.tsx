import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Coins, TrendingUp, Music as MusicIcon, Users as UsersIcon, UserX, Wallet, CreditCard, QrCode } from 'lucide-react';
import {
  formatEURNumber,
  formatXAFNumber,
  formatXAFFixed,
  eurToXaf,
  PHYSICAL_STANDARD_PRICE_XAF,
  PHYSICAL_PREMIUM_PRICE_XAF,
} from '@/lib/currency';

// Pricing rules (EUR) — must mirror supabase/functions/create-card-checkout/index.ts
const STANDARD_PRICE_EUR = 5.00;
const STANDARD_CREDITS = 4;
const PREMIUM_PRICE_EUR = 10.00;
const PREMIUM_CREDITS_DEFAULT = 10; // matches checkout PRICING.premium.credits
const ARTIST_SHARE = 0.3;
const PLATFORM_SHARE = 0.7;

const STANDARD_PER_DOWNLOAD = STANDARD_PRICE_EUR / STANDARD_CREDITS; // 1.25 €

// Importe en EUR con la equivalencia XAF debajo (Franco CFA - paridad oficial)
const formatEUR = (eur: number, align: 'left' | 'right' = 'right'): ReactNode => (
  <span className={`inline-flex flex-col leading-tight ${align === 'right' ? 'items-end' : 'items-start'}`}>
    <span className="whitespace-nowrap tabular-nums">{formatEURNumber(eur)}</span>
    <span className="text-[0.65em] font-normal text-foreground whitespace-nowrap tabular-nums">
      {formatXAFNumber(eur)}
    </span>
  </span>
);

// XAF como valor principal (grande) y EUR como valor secundario debajo (pequeño)
// Útil para la sección de origen de tarjetas, donde el XAF tiene prioridad visual.
const formatXAFPrimary = (
  xaf: number,
  eur: number,
  align: 'left' | 'right' = 'right',
): ReactNode => (
  <span className={`inline-flex flex-col leading-tight ${align === 'right' ? 'items-end' : 'items-start'}`}>
    <span className="whitespace-nowrap tabular-nums font-semibold">{formatXAFFixed(xaf)}</span>
    <span className="text-[0.7em] font-normal text-muted-foreground whitespace-nowrap tabular-nums">
      {formatEURNumber(eur)}
    </span>
  </span>
);

interface DownloadRow {
  song_id: string;
  card_type: string | null;
  qr_card_id: string | null;
}

interface SongRow {
  id: string;
  title: string;
  artist_id: string;
  cover_url: string | null;
  artists?: { name: string } | null;
}

interface QrCardRow {
  id: string;
  card_type: 'standard' | 'premium';
  download_credits: number;
  origin: 'physical' | 'digital';
  is_activated: boolean | null;
}

interface CollaboratorRow {
  id: string;
  song_id: string | null;
  artist_name: string;
  share_percent: number;
  claimed_by_user_id: string | null;
}

const Monetization = () => {
  const [loading, setLoading] = useState(true);
  const [downloads, setDownloads] = useState<DownloadRow[]>([]);
  const [songs, setSongs] = useState<SongRow[]>([]);
  const [qrCards, setQrCards] = useState<Map<string, QrCardRow>>(new Map());
  const [collaborators, setCollaborators] = useState<CollaboratorRow[]>([]);
  const [search, setSearch] = useState('');
  const [poolSearch, setPoolSearch] = useState('');

  const fetchAll = async () => {
    const [{ data: dls }, { data: sgs }, { data: qrs }, { data: collabs }] = await Promise.all([
      supabase.from('user_downloads').select('song_id, card_type, qr_card_id'),
      supabase.from('songs').select('id, title, artist_id, cover_url, artists(name)').order('title'),
      supabase.from('qr_cards').select('id, card_type, download_credits, origin, is_activated'),
      supabase
        .from('song_collaborators')
        .select('id, song_id, artist_name, share_percent, claimed_by_user_id')
        .not('song_id', 'is', null),
    ]);
    setDownloads((dls as any) ?? []);
    setSongs((sgs as any) ?? []);
    const map = new Map<string, QrCardRow>();
    (qrs ?? []).forEach((q: any) => map.set(q.id, q));
    setQrCards(map);
    setCollaborators((collabs as any) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    fetchAll();

    // Refrescar en tiempo real cuando se activan/crean tarjetas o se registran descargas
    const channel = supabase
      .channel('monetization-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'qr_cards' }, () => fetchAll())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_downloads' }, () => fetchAll())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute revenue per download row based on the QR card it came from
  const revenueForDownload = (row: DownloadRow): number => {
    let cardType = row.card_type;
    let credits = 0;
    if (row.qr_card_id) {
      const qr = qrCards.get(row.qr_card_id);
      if (qr) {
        cardType = qr.card_type;
        credits = qr.download_credits > 0 ? qr.download_credits : 0;
      }
    }
    if (cardType === 'premium') {
      const c = credits > 0 ? credits : PREMIUM_CREDITS_DEFAULT;
      return PREMIUM_PRICE_EUR / c;
    }
    // default standard
    return STANDARD_PER_DOWNLOAD;
  };

  const songStats = useMemo(() => {
    const map = new Map<string, { downloads: number; revenue: number }>();
    downloads.forEach((d) => {
      if (!d.song_id) return;
      const r = revenueForDownload(d);
      const cur = map.get(d.song_id) ?? { downloads: 0, revenue: 0 };
      cur.downloads += 1;
      cur.revenue += r;
      map.set(d.song_id, cur);
    });
    return map;
  }, [downloads, qrCards]);

  const enrichedSongs = useMemo(() => {
    return songs.map((s) => {
      const stat = songStats.get(s.id) ?? { downloads: 0, revenue: 0 };
      return {
        ...s,
        downloads: stat.downloads,
        grossRevenue: stat.revenue,
        artistRevenue: stat.revenue * ARTIST_SHARE,
      };
    });
  }, [songs, songStats]);

  const filteredSongs = useMemo(() => {
    const q = search.toLowerCase();
    return enrichedSongs
      .filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.artists?.name?.toLowerCase().includes(q),
      )
      .sort((a, b) => b.grossRevenue - a.grossRevenue);
  }, [enrichedSongs, search]);

  const artistStats = useMemo(() => {
    const map = new Map<
      string,
      { name: string; downloads: number; gross: number; artistShare: number }
    >();
    enrichedSongs.forEach((s) => {
      const key = s.artist_id;
      const cur = map.get(key) ?? {
        name: s.artists?.name ?? '—',
        downloads: 0,
        gross: 0,
        artistShare: 0,
      };
      cur.downloads += s.downloads;
      cur.gross += s.grossRevenue;
      cur.artistShare += s.artistRevenue;
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.artistShare - a.artistShare);
  }, [enrichedSongs]);

  // Pozo de colaboradores no reclamados (artistas no dados de alta o sin reclamar)
  // Para cada song con colaboradores, repartimos los ingresos del artista (30%) según share_percent
  // de los colaboradores cuyo claimed_by_user_id IS NULL.
  const unclaimedPool = useMemo(() => {
    // Agrupar colaboradores por canción
    const bySong = new Map<string, CollaboratorRow[]>();
    collaborators.forEach((c) => {
      if (!c.song_id) return;
      const arr = bySong.get(c.song_id) ?? [];
      arr.push(c);
      bySong.set(c.song_id, arr);
    });

    // Por artist_name (no reclamado) acumular descargas y € pendientes
    const byArtist = new Map<
      string,
      { name: string; downloads: number; pending: number; songs: Set<string> }
    >();
    let totalPending = 0;
    let totalDownloadsInPool = 0;

    enrichedSongs.forEach((s) => {
      const collabs = bySong.get(s.id);
      if (!collabs || collabs.length === 0) return;
      const unclaimed = collabs.filter((c) => !c.claimed_by_user_id);
      if (unclaimed.length === 0) return;

      unclaimed.forEach((c) => {
        const sharePct = Number(c.share_percent) / 100;
        const pending = s.artistRevenue * sharePct;
        const dlShare = s.downloads * sharePct;
        const key = c.artist_name.trim().toLowerCase();
        const cur = byArtist.get(key) ?? {
          name: c.artist_name,
          downloads: 0,
          pending: 0,
          songs: new Set<string>(),
        };
        cur.downloads += dlShare;
        cur.pending += pending;
        cur.songs.add(s.id);
        byArtist.set(key, cur);
        totalPending += pending;
        totalDownloadsInPool += dlShare;
      });
    });

    return {
      list: Array.from(byArtist.values())
        .map((a) => ({ ...a, songCount: a.songs.size }))
        .sort((x, y) => y.pending - x.pending),
      totalPending,
      totalDownloadsInPool,
    };
  }, [collaborators, enrichedSongs]);

  const filteredPool = useMemo(() => {
    const q = poolSearch.toLowerCase();
    return unclaimedPool.list.filter((a) => a.name.toLowerCase().includes(q));
  }, [unclaimedPool, poolSearch]);

  // Ingresos brutos por venta de tarjetas físicas (XAF → EUR aprox.)
  // Se calcula aquí también para poder sumarlo al bruto general.
  const physicalSalesEur = useMemo(() => {
    let xaf = 0;
    qrCards.forEach((qr: any) => {
      if (qr.origin !== 'physical' || !qr.is_activated) return;
      xaf += qr.card_type === 'premium' ? PHYSICAL_PREMIUM_PRICE_XAF : PHYSICAL_STANDARD_PRICE_XAF;
    });
    return xaf / 655.957;
  }, [qrCards]);

  const totals = useMemo(() => {
    const totalDownloads = downloads.length;
    const downloadsGross = enrichedSongs.reduce((acc, s) => acc + s.grossRevenue, 0);
    // Ingresos brutos = descargas (créditos consumidos) + ventas físicas (XAF→EUR)
    const totalGross = downloadsGross + physicalSalesEur;
    return {
      totalDownloads,
      totalGross,
      downloadsGross,
      physicalSalesEur,
      totalArtist: totalGross * ARTIST_SHARE,
      totalPlatform: totalGross * PLATFORM_SHARE,
    };
  }, [downloads.length, enrichedSongs, physicalSalesEur]);

  // Desglose por tipo de tarjeta (estándar / premium)
  const byCardType = useMemo(() => {
    const acc = {
      standard: { downloads: 0, gross: 0 },
      premium: { downloads: 0, gross: 0 },
    };
    downloads.forEach((d) => {
      let cardType: string | null = d.card_type;
      if (d.qr_card_id) {
        const qr = qrCards.get(d.qr_card_id);
        if (qr) cardType = qr.card_type;
      }
      const r = revenueForDownload(d);
      const bucket = cardType === 'premium' ? 'premium' : 'standard';
      acc[bucket].downloads += 1;
      acc[bucket].gross += r;
    });
    // Conteo de tarjetas activadas por tipo (físicas + digitales)
    const cardCounts = { standard: 0, premium: 0 };
    qrCards.forEach((qr: any) => {
      if (!qr.is_activated) return;
      if (qr.card_type === 'premium') cardCounts.premium += 1;
      else cardCounts.standard += 1;
    });
    return {
      standard: {
        ...acc.standard,
        cards: cardCounts.standard,
        artist: acc.standard.gross * ARTIST_SHARE,
        platform: acc.standard.gross * PLATFORM_SHARE,
      },
      premium: {
        ...acc.premium,
        cards: cardCounts.premium,
        artist: acc.premium.gross * ARTIST_SHARE,
        platform: acc.premium.gross * PLATFORM_SHARE,
      },
    };
  }, [downloads, qrCards]);

  // Desglose por ORIGEN de tarjeta (físicas XAF vs virtuales EUR)
  // Físicas → vendidas en CFA (3000 XAF estándar / 7000 XAF premium) con QR o 6 dígitos.
  // Virtuales → vendidas en EUR (5 € estándar / 10 € premium) por checkout digital.
  const byOrigin = useMemo(() => {
    const make = () => ({
      standard: { count: 0, activated: 0, downloads: 0, gross: 0 },
      premium: { count: 0, activated: 0, downloads: 0, gross: 0 },
    });
    const physical = make();
    const digital = make();

    // Inventario de tarjetas: contar todas las creadas por origen + tipo
    qrCards.forEach((qr: any) => {
      const bucket = qr.origin === 'digital' ? digital : physical;
      const tier = qr.card_type === 'premium' ? 'premium' : 'standard';
      bucket[tier].count += 1;
      if (qr.is_activated) bucket[tier].activated += 1;
    });

    // Descargas: atribuir cada descarga al origen de su tarjeta
    downloads.forEach((d) => {
      if (!d.qr_card_id) return;
      const qr = qrCards.get(d.qr_card_id);
      if (!qr) return;
      const bucket = qr.origin === 'digital' ? digital : physical;
      const tier = qr.card_type === 'premium' ? 'premium' : 'standard';
      bucket[tier].downloads += 1;
      bucket[tier].gross += revenueForDownload(d);
    });

    // Para físicas: ingresos brutos POR VENTA en XAF (precio fijo × tarjetas activadas)
    // Para virtuales: ingresos brutos POR VENTA en EUR (precio fijo × tarjetas activadas)
    const physicalSalesXaf =
      physical.standard.activated * PHYSICAL_STANDARD_PRICE_XAF +
      physical.premium.activated * PHYSICAL_PREMIUM_PRICE_XAF;
    const digitalSalesEur =
      digital.standard.activated * STANDARD_PRICE_EUR +
      digital.premium.activated * PREMIUM_PRICE_EUR;

    return {
      physical: {
        ...physical,
        salesXaf: physicalSalesXaf,
        salesEur: physicalSalesXaf / 655.957, // referencia EUR
      },
      digital: {
        ...digital,
        salesEur: digitalSalesEur,
        salesXaf: eurToXaf(digitalSalesEur),
      },
    };
  }, [qrCards, downloads]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-1/3 bg-muted rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-muted rounded animate-pulse" />
          ))}
        </div>
        <div className="h-80 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Monetización</h1>
        <p className="text-muted-foreground">
          Reparto por descarga: artista 30% · Yusiop 70%.
        </p>
      </div>

      {/* Pricing rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reglas de precio y reparto</CardTitle>
          <CardDescription>
            Estándar: {formatEUR(STANDARD_PRICE_EUR)} ({STANDARD_CREDITS} descargas →{' '}
            {formatEUR(STANDARD_PER_DOWNLOAD)} / descarga). Premium: {formatEUR(PREMIUM_PRICE_EUR)} —
            valor por descarga calculado según los créditos de cada tarjeta. Reparto por descarga:{' '}
            <strong>Artista 30%</strong> · <strong>Yusiop 70%</strong>.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Descargas totales</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <MusicIcon className="h-5 w-5 text-yusiop-primary" />
              {totals.totalDownloads.toLocaleString('es-ES')}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ingresos brutos</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Coins className="h-5 w-5 text-yusiop-primary" />
              {formatEUR(totals.totalGross)}
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-1 leading-tight">
              Descargas: {formatEURNumber(totals.downloadsGross)}
              <br />
              Tarjetas físicas: {formatEURNumber(totals.physicalSalesEur)}
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Bolsa artistas (30%)</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <UsersIcon className="h-5 w-5 text-yusiop-primary" />
              {formatEUR(totals.totalArtist)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Yusiop (60%)</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-yusiop-primary" />
              {formatEUR(totals.totalPlatform)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Desglose por tipo de tarjeta */}
      <div className="grid gap-4 md:grid-cols-2">
        {([
          {
            key: 'standard' as const,
            label: 'Tarjeta Estándar',
            price: STANDARD_PRICE_EUR,
            credits: STANDARD_CREDITS,
            data: byCardType.standard,
          },
          {
            key: 'premium' as const,
            label: 'Tarjeta Premium',
            price: PREMIUM_PRICE_EUR,
            credits: PREMIUM_CREDITS_DEFAULT,
            data: byCardType.premium,
          },
        ]).map((card) => (
          <Card key={card.key} className={card.key === 'premium' ? 'border-yusiop-primary/30' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-yusiop-primary" />
                  {card.label}
                </CardTitle>
                <Badge variant={card.key === 'premium' ? 'default' : 'secondary'}>
                  {formatEUR(card.price)}
                </Badge>
              </div>
              <CardDescription>
                {formatEUR(card.price / card.credits)} por descarga
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Descargas</p>
                  <p className="text-xl font-semibold">
                    {card.data.downloads.toLocaleString('es-ES')}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Bruto</p>
                  <p className="text-xl font-semibold">{formatEUR(card.data.gross)}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Artistas (30%)</p>
                  <p className="text-xl font-semibold text-yusiop-primary">
                    {formatEUR(card.data.artist)}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Yusiop (60%)</p>
                  <p className="text-xl font-semibold">{formatEUR(card.data.platform)}</p>
                </div>
                <div className="rounded-md border p-3 bg-yusiop-primary/5">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CreditCard className="h-3 w-3" />
                    Tarjetas activadas
                  </p>
                  <p className="text-xl font-semibold text-yusiop-primary">
                    {card.data.cards.toLocaleString('es-ES')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Facturación por origen de tarjeta — Solo físicas con XAF en primer plano */}
      <Card className="border-yusiop-primary/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-yusiop-primary" />
            Facturación tarjetas físicas
          </CardTitle>
          <CardDescription>
            Control de tarjetas <strong>físicas</strong> vendidas en XAF (3.000 estándar / 7.000 premium) 
            con QR o código de 6 dígitos. El XAF se muestra como valor principal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-1 max-w-2xl">
            {/* Físicas — única sección */}
            <Card className="bg-muted/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <QrCode className="h-5 w-5 text-yusiop-primary" />
                    Tarjetas físicas (XAF)
                  </CardTitle>
                  <Badge variant="secondary">QR · 6 dígitos</Badge>
                </div>
                <CardDescription>
                  Estándar {formatXAFFixed(PHYSICAL_STANDARD_PRICE_XAF)} · Premium{' '}
                  {formatXAFFixed(PHYSICAL_PREMIUM_PRICE_XAF)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-md border p-4 bg-background">
                  <p className="text-xs text-muted-foreground mb-1">Facturación total (activadas)</p>
                  <p className="text-2xl font-bold tabular-nums text-foreground">
                    {formatXAFFixed(byOrigin.physical.salesXaf)}
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    ≈ {formatEURNumber(byOrigin.physical.salesEur)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Estándar activadas</p>
                    <p className="text-lg font-semibold">
                      {byOrigin.physical.standard.activated}
                      <span className="text-xs text-muted-foreground font-normal">
                        {' '}/ {byOrigin.physical.standard.count}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums mt-1">
                      {formatXAFFixed(
                        byOrigin.physical.standard.activated * PHYSICAL_STANDARD_PRICE_XAF,
                      )}
                    </p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Premium activadas</p>
                    <p className="text-lg font-semibold">
                      {byOrigin.physical.premium.activated}
                      <span className="text-xs text-muted-foreground font-normal">
                        {' '}/ {byOrigin.physical.premium.count}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums mt-1">
                      {formatXAFFixed(
                        byOrigin.physical.premium.activated * PHYSICAL_PREMIUM_PRICE_XAF,
                      )}
                    </p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Descargas usadas</p>
                    <p className="text-lg font-semibold">
                      {(byOrigin.physical.standard.downloads + byOrigin.physical.premium.downloads).toLocaleString('es-ES')}
                    </p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Inventario total</p>
                    <p className="text-lg font-semibold">
                      {byOrigin.physical.standard.count + byOrigin.physical.premium.count}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Total físicas destacado */}
          <div className="rounded-lg border-2 border-yusiop-primary/40 p-4 bg-gradient-to-br from-yusiop-primary/5 to-transparent max-w-2xl">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Facturación total tarjetas físicas</p>
                <p className="text-3xl font-bold tabular-nums mt-1 text-foreground">
                  {formatXAFFixed(byOrigin.physical.salesXaf)}
                </p>
                <p className="text-sm text-muted-foreground tabular-nums">
                  ≈ {formatEURNumber(byOrigin.physical.salesEur)}
                </p>
              </div>
              <div className="flex gap-4 text-sm">
                <div className="text-center">
                  <p className="text-muted-foreground">Estándar</p>
                  <p className="font-semibold">{byOrigin.physical.standard.activated}</p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground">Premium</p>
                  <p className="font-semibold">{byOrigin.physical.premium.activated}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pozo de colaboradores no reclamados */}
      <Card className="border-yusiop-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-yusiop-primary" />
            Pozo de monetización pendiente
          </CardTitle>
          <CardDescription>
            Importes de colaboradores cuyo nombre artístico aparece en splits pero que aún no están
            registrados en la app o no han reclamado su parte. El dinero queda retenido hasta que el
            artista verifique su identidad.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardDescription>Total pendiente en el pozo</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Coins className="h-5 w-5 text-yusiop-primary" />
                  {formatEUR(unclaimedPool.totalPending)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardDescription>Artistas sin reclamar</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <UserX className="h-5 w-5 text-yusiop-primary" />
                  {unclaimedPool.list.length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardDescription>Descargas asociadas</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <MusicIcon className="h-5 w-5 text-yusiop-primary" />
                  {unclaimedPool.totalDownloadsInPool.toLocaleString('es-ES', {
                    maximumFractionDigits: 1,
                  })}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar artista colaborador..."
              value={poolSearch}
              onChange={(e) => setPoolSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="rounded-md border max-h-[360px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Artista colaborador</TableHead>
                  <TableHead className="text-right">Canciones</TableHead>
                  <TableHead className="text-right">Descargas (su parte)</TableHead>
                  <TableHead className="text-right">Importe pendiente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPool.map((a) => (
                  <TableRow key={a.name}>
                    <TableCell className="font-medium">
                      {a.name}
                      <Badge variant="outline" className="ml-2 text-xs">
                        Sin reclamar
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{a.songCount}</TableCell>
                    <TableCell className="text-right">
                      {a.downloads.toLocaleString('es-ES', { maximumFractionDigits: 1 })}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-yusiop-primary">
                      {formatEUR(a.pending)}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredPool.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No hay importes pendientes en el pozo.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Songs revenue */}
      <Card>
        <CardHeader>
          <CardTitle>Ingresos por canción</CardTitle>
          <CardDescription>
            Precio por descarga, descargas registradas, ingreso bruto y bolsa del artista.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar canción o artista..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="rounded-md border max-h-[360px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Canción</TableHead>
                  <TableHead>Artista</TableHead>
                  <TableHead className="text-right">Precio / descarga</TableHead>
                  <TableHead className="text-right">Descargas</TableHead>
                  <TableHead className="text-right">Bruto</TableHead>
                  <TableHead className="text-right">Artista (30%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSongs.map((s) => {
                  const pricePerDl =
                    s.downloads > 0 ? s.grossRevenue / s.downloads : STANDARD_PER_DOWNLOAD;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.title}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {s.artists?.name ?? '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {s.downloads > 0 ? (
                          formatEUR(pricePerDl)
                        ) : (
                          <Badge variant="outline">{formatEUR(STANDARD_PER_DOWNLOAD)}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{s.downloads}</TableCell>
                      <TableCell className="text-right">{formatEUR(s.grossRevenue)}</TableCell>
                      <TableCell className="text-right font-semibold text-yusiop-primary">
                        {formatEUR(s.artistRevenue)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredSongs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No hay canciones que coincidan
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Artist revenue */}
      <Card>
        <CardHeader>
          <CardTitle>Recaudación por artista</CardTitle>
          <CardDescription>Bolsa total acumulada por cada artista (30%).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border max-h-[360px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Artista</TableHead>
                  <TableHead className="text-right">Descargas</TableHead>
                  <TableHead className="text-right">Bruto generado</TableHead>
                  <TableHead className="text-right">Bolsa artista</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {artistStats.map((a) => (
                  <TableRow key={a.name}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell className="text-right">{a.downloads}</TableCell>
                    <TableCell className="text-right">{formatEUR(a.gross)}</TableCell>
                    <TableCell className="text-right font-semibold text-yusiop-primary">
                      {formatEUR(a.artistShare)}
                    </TableCell>
                  </TableRow>
                ))}
                {artistStats.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Sin datos todavía
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Monetization;
