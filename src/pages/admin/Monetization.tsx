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
import { Search, Coins, TrendingUp, Music as MusicIcon, Users as UsersIcon } from 'lucide-react';

// Pricing rules (XAF base, displayed in EUR using fixed CFA peg)
const XAF_PER_EUR = 655.957; // fixed parity
const STANDARD_PRICE_XAF = 3000;
const STANDARD_CREDITS = 4;
const PREMIUM_PRICE_XAF = 7000;
const PREMIUM_CREDITS_DEFAULT = 100; // fallback if not specified on card
const ARTIST_SHARE = 0.4;

const STANDARD_PER_DOWNLOAD = STANDARD_PRICE_XAF / STANDARD_CREDITS; // 750 XAF

const formatEUR = (xaf: number) =>
  `${(xaf / XAF_PER_EUR).toLocaleString('es-ES', {
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

const Monetization = () => {
  const [loading, setLoading] = useState(true);
  const [downloads, setDownloads] = useState<DownloadRow[]>([]);
  const [songs, setSongs] = useState<SongRow[]>([]);
  const [qrCards, setQrCards] = useState<Map<string, QrCardRow>>(new Map());
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const [{ data: dls }, { data: sgs }, { data: qrs }] = await Promise.all([
        supabase.from('user_downloads').select('song_id, card_type, qr_card_id'),
        supabase.from('songs').select('id, title, artist_id, cover_url, artists(name)').order('title'),
        supabase.from('qr_cards').select('id, card_type, download_credits'),
      ]);
      setDownloads((dls as any) ?? []);
      setSongs((sgs as any) ?? []);
      const map = new Map<string, QrCardRow>();
      (qrs ?? []).forEach((q: any) => map.set(q.id, q));
      setQrCards(map);
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
      return PREMIUM_PRICE_XAF / c;
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
            Estándar: {formatEUR(STANDARD_PRICE_XAF)} ({STANDARD_CREDITS} descargas →{' '}
            {formatEUR(STANDARD_PER_DOWNLOAD)} / descarga). Premium: {formatEUR(PREMIUM_PRICE_XAF)} —
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
    </div>
  );
};

export default Monetization;
