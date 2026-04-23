import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Search,
  Download,
  Music,
  User,
  ArrowLeft,
  FileDown,
  TrendingUp,
  Disc3,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type RangeKey = '7d' | '30d' | '90d' | '1y' | 'all';

interface DownloadRow {
  id: string;
  user_id: string | null;
  song_id: string;
  qr_card_id: string | null;
  downloaded_at: string;
  card_type: string | null;
  user_email: string | null;
  songs?: {
    title: string;
    artist_id: string;
    artists?: { id: string; name: string };
  } | null;
}

interface ArtistAggregate {
  artistId: string;
  artistName: string;
  downloads: number;
  uniqueSongs: number;
  uniqueListeners: number;
  lastDownload: string;
}

interface SongAggregate {
  songId: string;
  title: string;
  downloads: number;
  uniqueListeners: number;
  lastDownload: string;
}

const rangeToDays = (range: RangeKey): number | null => {
  switch (range) {
    case '7d':
      return 7;
    case '30d':
      return 30;
    case '90d':
      return 90;
    case '1y':
      return 365;
    default:
      return null;
  }
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const formatNumber = (n: number) => new Intl.NumberFormat('es-ES').format(n);

const downloadCsv = (filename: string, rows: (string | number)[][]) => {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const v = String(cell ?? '');
          return /[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
        })
        .join(','),
    )
    .join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const Downloads = () => {
  const [downloads, setDownloads] = useState<DownloadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<RangeKey>('30d');
  const [artistFilter, setArtistFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArtist, setSelectedArtist] = useState<ArtistAggregate | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchDownloads(range);
  }, [range]);

  const fetchDownloads = async (r: RangeKey) => {
    setLoading(true);
    try {
      let query = supabase
        .from('user_downloads')
        .select(`
          id,
          user_id,
          song_id,
          qr_card_id,
          downloaded_at,
          card_type,
          user_email,
          songs:song_id (
            title,
            artist_id,
            artists:artist_id ( id, name )
          )
        `)
        .order('downloaded_at', { ascending: false })
        .limit(5000);

      const days = rangeToDays(r);
      if (days !== null) {
        const from = new Date();
        from.setDate(from.getDate() - days);
        query = query.gte('downloaded_at', from.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      setDownloads((data as unknown as DownloadRow[]) ?? []);
    } catch (error) {
      console.error('Error fetching downloads:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las descargas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Lista de artistas únicos para el filtro
  const artistOptions = useMemo(() => {
    const map = new Map<string, string>();
    downloads.forEach((d) => {
      const a = d.songs?.artists;
      if (a?.id && a?.name) map.set(a.id, a.name);
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [downloads]);

  // Filtrado base por artista + búsqueda
  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return downloads.filter((d) => {
      if (artistFilter !== 'all' && d.songs?.artist_id !== artistFilter) return false;
      if (!term) return true;
      return (
        d.songs?.title?.toLowerCase().includes(term) ||
        d.songs?.artists?.name?.toLowerCase().includes(term) ||
        d.user_email?.toLowerCase().includes(term)
      );
    });
  }, [downloads, artistFilter, searchTerm]);

  // Agregado por artista
  const artistReport = useMemo<ArtistAggregate[]>(() => {
    const map = new Map<
      string,
      {
        name: string;
        downloads: number;
        songs: Set<string>;
        listeners: Set<string>;
        last: string;
      }
    >();
    filtered.forEach((d) => {
      const id = d.songs?.artist_id;
      const name = d.songs?.artists?.name ?? 'Desconocido';
      if (!id) return;
      const entry =
        map.get(id) ??
        { name, downloads: 0, songs: new Set<string>(), listeners: new Set<string>(), last: '' };
      entry.downloads += 1;
      entry.songs.add(d.song_id);
      entry.listeners.add(d.user_email ?? d.user_id ?? d.id);
      if (!entry.last || d.downloaded_at > entry.last) entry.last = d.downloaded_at;
      map.set(id, entry);
    });
    return Array.from(map.entries())
      .map(([artistId, v]) => ({
        artistId,
        artistName: v.name,
        downloads: v.downloads,
        uniqueSongs: v.songs.size,
        uniqueListeners: v.listeners.size,
        lastDownload: v.last,
      }))
      .sort((a, b) => b.downloads - a.downloads);
  }, [filtered]);

  // Desglose por canción del artista seleccionado
  const songBreakdown = useMemo<SongAggregate[]>(() => {
    if (!selectedArtist) return [];
    const map = new Map<
      string,
      { title: string; downloads: number; listeners: Set<string>; last: string }
    >();
    filtered
      .filter((d) => d.songs?.artist_id === selectedArtist.artistId)
      .forEach((d) => {
        const entry =
          map.get(d.song_id) ??
          {
            title: d.songs?.title ?? 'Desconocida',
            downloads: 0,
            listeners: new Set<string>(),
            last: '',
          };
        entry.downloads += 1;
        entry.listeners.add(d.user_email ?? d.user_id ?? d.id);
        if (!entry.last || d.downloaded_at > entry.last) entry.last = d.downloaded_at;
        map.set(d.song_id, entry);
      });
    return Array.from(map.entries())
      .map(([songId, v]) => ({
        songId,
        title: v.title,
        downloads: v.downloads,
        uniqueListeners: v.listeners.size,
        lastDownload: v.last,
      }))
      .sort((a, b) => b.downloads - a.downloads);
  }, [filtered, selectedArtist]);

  // KPIs
  const totalDownloads = filtered.length;
  const uniqueListeners = useMemo(
    () => new Set(filtered.map((d) => d.user_email ?? d.user_id ?? d.id)).size,
    [filtered],
  );
  const uniqueSongsCount = useMemo(
    () => new Set(filtered.map((d) => d.song_id)).size,
    [filtered],
  );
  const uniqueArtistsCount = artistReport.length;

  const exportArtistsCsv = () => {
    const rows: (string | number)[][] = [
      ['Artista', 'Descargas', 'Canciones únicas', 'Oyentes únicos', 'Última descarga'],
      ...artistReport.map((a) => [
        a.artistName,
        a.downloads,
        a.uniqueSongs,
        a.uniqueListeners,
        a.lastDownload ? formatDate(a.lastDownload) : '',
      ]),
    ];
    downloadCsv(`informe-artistas-${range}.csv`, rows);
  };

  const exportSongsCsv = () => {
    if (!selectedArtist) return;
    const rows: (string | number)[][] = [
      ['Canción', 'Descargas', 'Oyentes únicos', 'Última descarga'],
      ...songBreakdown.map((s) => [
        s.title,
        s.downloads,
        s.uniqueListeners,
        s.lastDownload ? formatDate(s.lastDownload) : '',
      ]),
    ];
    downloadCsv(
      `informe-${selectedArtist.artistName.replace(/\s+/g, '_')}-${range}.csv`,
      rows,
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="grid gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Informe de Descargas</h1>
          <p className="text-muted-foreground">
            Reporte estilo agregadora: rendimiento por artista y canción
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 días</SelectItem>
              <SelectItem value="30d">Últimos 30 días</SelectItem>
              <SelectItem value="90d">Últimos 90 días</SelectItem>
              <SelectItem value="1y">Último año</SelectItem>
              <SelectItem value="all">Todo el histórico</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
          <CardDescription>Acota por artista o busca por texto libre</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar canción, artista o usuario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={artistFilter} onValueChange={setArtistFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por artista" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los artistas</SelectItem>
                {artistOptions.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatNumber(totalDownloads)}</p>
              <p className="text-xs text-muted-foreground">Descargas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatNumber(uniqueListeners)}</p>
              <p className="text-xs text-muted-foreground">Oyentes únicos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Disc3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatNumber(uniqueArtistsCount)}</p>
              <p className="text-xs text-muted-foreground">Artistas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Music className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatNumber(uniqueSongsCount)}</p>
              <p className="text-xs text-muted-foreground">Canciones</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="artists">
        <TabsList>
          <TabsTrigger value="artists">
            <TrendingUp className="h-4 w-4 mr-2" /> Por artista
          </TabsTrigger>
          <TabsTrigger value="recent">
            <Download className="h-4 w-4 mr-2" /> Descargas recientes
          </TabsTrigger>
        </TabsList>

        {/* Vista por artista */}
        <TabsContent value="artists" className="space-y-4">
          {!selectedArtist ? (
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Ranking de artistas</CardTitle>
                  <CardDescription>
                    Ordenado por número de descargas. Haz clic en un artista para ver el desglose por canción.
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={exportArtistsCsv} disabled={artistReport.length === 0}>
                  <FileDown className="h-4 w-4 mr-2" /> Exportar CSV
                </Button>
              </CardHeader>
              <CardContent>
                {artistReport.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No hay descargas en el rango seleccionado
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Artista</TableHead>
                        <TableHead className="text-right">Descargas</TableHead>
                        <TableHead className="text-right">Canciones</TableHead>
                        <TableHead className="text-right">Oyentes</TableHead>
                        <TableHead>Última descarga</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {artistReport.map((a, idx) => (
                        <TableRow
                          key={a.artistId}
                          className="cursor-pointer"
                          onClick={() => setSelectedArtist(a)}
                        >
                          <TableCell className="font-mono text-muted-foreground">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="font-medium">{a.artistName}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatNumber(a.downloads)}
                          </TableCell>
                          <TableCell className="text-right">{a.uniqueSongs}</TableCell>
                          <TableCell className="text-right">{a.uniqueListeners}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {a.lastDownload ? formatDate(a.lastDownload) : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0 gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedArtist(null)}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" /> Volver
                  </Button>
                  <div>
                    <CardTitle>{selectedArtist.artistName}</CardTitle>
                    <CardDescription>
                      {formatNumber(selectedArtist.downloads)} descargas ·{' '}
                      {selectedArtist.uniqueSongs} canciones ·{' '}
                      {selectedArtist.uniqueListeners} oyentes
                    </CardDescription>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={exportSongsCsv}>
                  <FileDown className="h-4 w-4 mr-2" /> Exportar CSV
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Canción</TableHead>
                      <TableHead className="text-right">Descargas</TableHead>
                      <TableHead className="text-right">Oyentes</TableHead>
                      <TableHead>Última descarga</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {songBreakdown.map((s, idx) => (
                      <TableRow key={s.songId}>
                        <TableCell className="font-mono text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-medium">{s.title}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatNumber(s.downloads)}
                        </TableCell>
                        <TableCell className="text-right">{s.uniqueListeners}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {s.lastDownload ? formatDate(s.lastDownload) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Descargas recientes */}
        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle>Descargas recientes</CardTitle>
              <CardDescription>
                Últimas {Math.min(filtered.length, 200)} descargas en el rango seleccionado
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filtered.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No se encontraron descargas
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Canción</TableHead>
                      <TableHead>Artista</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Origen</TableHead>
                      <TableHead className="text-right">Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.slice(0, 200).map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">
                          {d.songs?.title ?? '—'}
                        </TableCell>
                        <TableCell>{d.songs?.artists?.name ?? '—'}</TableCell>
                        <TableCell className="text-sm">
                          {d.user_email ?? 'Anónimo'}
                        </TableCell>
                        <TableCell>
                          {d.qr_card_id ? (
                            <Badge variant="secondary">QR</Badge>
                          ) : (
                            <Badge variant="outline">Directa</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {formatDate(d.downloaded_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Downloads;
