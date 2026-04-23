import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X, Clock, Play, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface SubmissionRow {
  id: string;
  user_id: string;
  title: string;
  artist_name: string;
  album_title: string | null;
  duration_seconds: number;
  track_url: string;
  track_path: string | null;
  preview_url: string | null;
  preview_path: string | null;
  cover_url: string | null;
  cover_path: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  created_at: string;
}

const formatDuration = (s: number) => {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
};

const SongSubmissions = () => {
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<SubmissionRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [signedUrls, setSignedUrls] = useState<Record<string, { track?: string; preview?: string }>>({});
  const [loadingAudio, setLoadingAudio] = useState<Record<string, 'track' | 'preview' | null>>({});
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  const load = async () => {
    setLoading(true);
    let q = supabase.from('song_submissions').select('*').order('created_at', { ascending: false });
    if (filter !== 'all') q = q.eq('status', filter);
    const { data, error } = await q;
    if (error) toast.error('Error cargando envíos');
    setRows((data ?? []) as SubmissionRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const approve = async (row: SubmissionRow) => {
    const { data, error } = await supabase.rpc('approve_song_submission', { p_submission_id: row.id });
    if (error) return toast.error(error.message);
    const result = (data as any)?.[0];
    if (result?.success) {
      toast.success(result.message);
      load();
    } else {
      toast.error(result?.message ?? 'Error');
    }
  };

  const openReject = (row: SubmissionRow) => {
    setRejectTarget(row);
    setRejectReason('');
    setRejectOpen(true);
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      toast.error('Indica un motivo de rechazo');
      return;
    }
    const { data, error } = await supabase.rpc('reject_song_submission', {
      p_submission_id: rejectTarget.id,
      p_reason: rejectReason.trim(),
    });
    if (error) return toast.error(error.message);
    const result = (data as any)?.[0];
    if (result?.success) {
      toast.success(result.message);
      setRejectOpen(false);
      load();
    } else {
      toast.error(result?.message ?? 'Error');
    }
  };

  const ensureSignedUrl = async (
    rowId: string,
    kind: 'track' | 'preview',
    path: string | null,
    fallbackUrl: string | null,
  ): Promise<string | null> => {
    const existing = signedUrls[rowId]?.[kind];
    if (existing) return existing;

    setLoadingAudio((s) => ({ ...s, [rowId]: kind }));
    try {
      let url: string | null = null;
      if (path) {
        const { data, error } = await supabase.storage
          .from('artist-submissions')
          .createSignedUrl(path, 60 * 60);
        if (!error && data) url = data.signedUrl;
      }
      if (!url) url = fallbackUrl;
      if (!url) {
        toast.error('No se pudo cargar el audio');
        return null;
      }
      setSignedUrls((s) => ({ ...s, [rowId]: { ...s[rowId], [kind]: url! } }));
      return url;
    } finally {
      setLoadingAudio((s) => ({ ...s, [rowId]: null }));
    }
  };

  const loadAndPlay = async (
    rowId: string,
    kind: 'track' | 'preview',
    path: string | null,
    fallbackUrl: string | null,
  ) => {
    const url = await ensureSignedUrl(rowId, kind, path, fallbackUrl);
    if (!url) return;
    // Pause any other audio currently playing
    Object.entries(audioRefs.current).forEach(([key, el]) => {
      if (key !== `${rowId}:${kind}` && el && !el.paused) el.pause();
    });
    const el = audioRefs.current[`${rowId}:${kind}`];
    if (el) {
      try {
        await el.play();
      } catch (e) {
        console.error('Play failed', e);
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Envíos de canciones</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Revisa, aprueba o rechaza las canciones enviadas por los artistas.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? 'default' : 'outline'}
            onClick={() => setFilter(f)}
          >
            {f === 'pending' && 'Pendientes'}
            {f === 'approved' && 'Aprobadas'}
            {f === 'rejected' && 'Rechazadas'}
            {f === 'all' && 'Todas'}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No hay envíos en este filtro.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rows.map((row) => (
            <Card key={row.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 rounded-md bg-muted overflow-hidden flex items-center justify-center flex-shrink-0">
                    {row.cover_url ? (
                      <img src={row.cover_url} alt={row.title} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2 flex-wrap">
                      {row.title}
                      <Badge
                        variant={
                          row.status === 'approved'
                            ? 'default'
                            : row.status === 'rejected'
                              ? 'destructive'
                              : 'secondary'
                        }
                      >
                        {row.status === 'pending' && (<><Clock className="h-3 w-3 mr-1" /> Pendiente</>)}
                        {row.status === 'approved' && 'Publicada'}
                        {row.status === 'rejected' && 'Rechazada'}
                      </Badge>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {row.artist_name}
                      {row.album_title ? ` · ${row.album_title}` : ''}
                      {' · '}{formatDuration(row.duration_seconds)}
                      {' · '}{new Date(row.created_at).toLocaleString('es-ES')}
                    </p>
                  </div>
                </div>
                {row.status === 'pending' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="sm" onClick={() => approve(row)}>
                      <Check className="h-4 w-4 mr-1" /> Aprobar
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => openReject(row)}>
                      <X className="h-4 w-4 mr-1" /> Rechazar
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => playTrack(row.track_path, row.track_url)}>
                    <Play className="h-3 w-3 mr-1" /> Audio completo
                  </Button>
                  {row.preview_url && (
                    <Button size="sm" variant="outline" onClick={() => playTrack(row.preview_path, row.preview_url!)}>
                      <Play className="h-3 w-3 mr-1" /> Preview
                    </Button>
                  )}
                </div>

                {row.status === 'rejected' && row.rejection_reason && (
                  <div className="text-xs text-destructive">
                    <span className="font-semibold">Motivo de rechazo:</span> {row.rejection_reason}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar envío</DialogTitle>
            <DialogDescription>
              Explica al artista por qué su canción no ha sido aprobada. Recibirá una notificación.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Motivo del rechazo (obligatorio)"
            rows={4}
            maxLength={500}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmReject}>
              Rechazar y notificar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SongSubmissions;
