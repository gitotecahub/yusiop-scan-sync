import { useEffect, useMemo, useState } from 'react';
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
import { Search, Coins, TrendingUp, Music as MusicIcon, Users as UsersIcon, UserX, Wallet } from 'lucide-react';

// Pricing rules (EUR) — must mirror supabase/functions/create-card-checkout/index.ts
const STANDARD_PRICE_EUR = 4.99;
const STANDARD_CREDITS = 4;
const PREMIUM_PRICE_EUR = 9.99;
const PREMIUM_CREDITS_DEFAULT = 10; // matches checkout PRICING.premium.credits
const ARTIST_SHARE = 0.4;

const STANDARD_PER_DOWNLOAD = STANDARD_PRICE_EUR / STANDARD_CREDITS; // 1.2475 €

const formatEUR = (eur: number) =>
  `${eur.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;

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

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const [{ data: dls }, { data: sgs }, { data: qrs }, { data: collabs }] = await Promise.all([
        supabase.from('user_downloads').select('song_id, card_type, qr_card_id'),
        supabase.from('songs').select('id, title, artist_id, cover_url, artists(name)').order('title'),
        supabase.from('qr_cards').select('id, card_type, download_credits'),
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
    fetchAll();
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
  // Para cada song con colaboradores, repartimos los ingresos del artista (40%) según share_percent
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

  const totals = useMemo(() => {
    const totalDownloads = downloads.length;
    const totalGross = enrichedSongs.reduce((acc, s) => acc + s.grossRevenue, 0);
    return {
      totalDownloads,
      totalGross,
      totalArtist: totalGross * ARTIST_SHARE,
      totalPlatform: totalGross * (1 - ARTIST_SHARE),
    };
  }, [downloads.length, enrichedSongs]);

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
    return {
      standard: {
        ...acc.standard,
        artist: acc.standard.gross * ARTIST_SHARE,
        platform: acc.standard.gross * (1 - ARTIST_SHARE),
      },
      premium: {
        ...acc.premium,
        artist: acc.premium.gross * ARTIST_SHARE,
        platform: acc.premium.gross * (1 - ARTIST_SHARE),
      },
    };
  }, [downloads, qrCards]);

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
          Ingresos por canción y bolsa del artista (40% del valor de cada descarga).
        </p>
      </div>

      {/* Pricing rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reglas de precio</CardTitle>
          <CardDescription>
            Estándar: {formatEUR(STANDARD_PRICE_EUR)} ({STANDARD_CREDITS} descargas →{' '}
            {formatEUR(STANDARD_PER_DOWNLOAD)} / descarga). Premium: {formatEUR(PREMIUM_PRICE_EUR)} —
            valor por descarga calculado según los créditos de cada tarjeta. Artista: 40% por descarga.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-4">
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
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Bolsa artistas (40%)</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <UsersIcon className="h-5 w-5 text-yusiop-primary" />
              {formatEUR(totals.totalArtist)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Plataforma (60%)</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-yusiop-primary" />
              {formatEUR(totals.totalPlatform)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

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

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Canción</TableHead>
                  <TableHead>Artista</TableHead>
                  <TableHead className="text-right">Precio / descarga</TableHead>
                  <TableHead className="text-right">Descargas</TableHead>
                  <TableHead className="text-right">Bruto</TableHead>
                  <TableHead className="text-right">Artista (40%)</TableHead>
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
          <CardDescription>Bolsa total acumulada por cada artista (40%).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
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

          <div className="rounded-md border">
            <Table>
              <TableHeader>
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
    </div>
  );
};

export default Monetization;
