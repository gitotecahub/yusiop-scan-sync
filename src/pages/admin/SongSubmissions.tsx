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
import { Check, X, Clock, Play, Image as ImageIcon, Info, Ban, CalendarClock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { parseRejectionReason } from '@/lib/parseRejectionReason';
import ApproveSubmissionDialog from '@/components/admin/ApproveSubmissionDialog';
import { formatMadrid } from '@/lib/madridTime';
import CopyrightBadge, { type CopyrightStatus } from '@/components/copyright/CopyrightBadge';
import CopyrightDetails, { type CopyrightMatch } from '@/components/copyright/CopyrightDetails';

interface SubmissionRow {
  id: string;
  user_id: string;
  title: string;
  artist_name: string;
  album_title: string | null;
  genre: string | null;
  release_date: string | null;
  duration_seconds: number;
  track_url: string;
  track_path: string | null;
  preview_url: string | null;
  preview_path: string | null;
  cover_url: string | null;
  cover_path: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'removed';
  rejection_reason: string | null;
  scheduled_release_at: string | null;
  created_at: string;
  reviewed_at: string | null;
  copyright_status: CopyrightStatus;
  copyright_score: number;
  copyright_matches: CopyrightMatch[] | null;
}

const formatDuration = (s: number) => {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
};

const SongSubmissions = () => {
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'removed' | 'all'>('pending');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<SubmissionRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsTarget, setDetailsTarget] = useState<SubmissionRow | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveTarget, setApproveTarget] = useState<SubmissionRow | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, { track?: string; preview?: string }>>({});
  const [loadingAudio, setLoadingAudio] = useState<Record<string, 'track' | 'preview' | null>>({});
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  const openDetails = (row: SubmissionRow) => {
    setDetailsTarget(row);
    setDetailsOpen(true);
  };

  const load = async () => {
    setLoading(true);
    let q = supabase.from('song_submissions').select('*').order('created_at', { ascending: false });
    if (filter !== 'all') q = q.eq('status', filter);
    const { data, error } = await q;
    if (error) toast.error('Error cargando envíos');
    setRows((data ?? []) as unknown as SubmissionRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const sendEmailNotification = async (
    kind: 'approved' | 'rejected',
    row: SubmissionRow,
    reason?: string,
  ) => {
    try {
      await supabase.functions.invoke('notify-song-review', {
        body: {
          submission_id: row.id,
          kind,
          reason,
          app_url: window.location.origin,
        },
      });
    } catch (e) {
      console.error('Error enviando email', e);
    }
  };

  const openApprove = (row: SubmissionRow) => {
    setApproveTarget(row);
    setApproveOpen(true);
  };

  const confirmApprove = async (releaseAtIso: string | null): Promise<void> => {
    if (!approveTarget) return;
    const { data, error } = await supabase.rpc('approve_song_submission_scheduled', {
      p_submission_id: approveTarget.id,
      p_release_at: releaseAtIso,
    });
    if (error) { toast.error(error.message); return; }
    const result = (data as any)?.[0];
    if (result?.success) {
      toast.success(result.message);
      sendEmailNotification('approved', approveTarget);
      // Notificar a los colaboradores no principales (si tienen email)
      try {
        await supabase.functions.invoke('notify-collaborators', {
          body: {
            submission_id: approveTarget.id,
            song_id: result.song_id ?? null,
            app_url: window.location.origin,
          },
        });
      } catch (e) {
        console.error('Error notificando colaboradores', e);
      }
      setApproveOpen(false);
      load();
      window.dispatchEvent(new CustomEvent('song-submissions-changed'));
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
    const reason = rejectReason.trim();
    const { data, error } = await supabase.rpc('reject_song_submission', {
      p_submission_id: rejectTarget.id,
      p_reason: reason,
    });
    if (error) return toast.error(error.message);
    const result = (data as any)?.[0];
    if (result?.success) {
      toast.success(result.message);
      sendEmailNotification('rejected', rejectTarget, reason);
      setRejectOpen(false);
      load();
      window.dispatchEvent(new CustomEvent('song-submissions-changed'));
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
        {(['pending', 'approved', 'rejected', 'removed', 'all'] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? 'default' : 'outline'}
            onClick={() => setFilter(f)}
          >
            {f === 'pending' && 'Pendientes'}
            {f === 'approved' && 'Aprobadas'}
            {f === 'rejected' && 'Rechazadas'}
            {f === 'removed' && 'Eliminadas'}
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
                            : row.status === 'rejected' || row.status === 'removed'
                              ? 'destructive'
                              : 'secondary'
                        }
                      >
                        {row.status === 'pending' && (<><Clock className="h-3 w-3 mr-1" /> Pendiente</>)}
                        {row.status === 'approved' && (
                          row.scheduled_release_at
                            ? (<><CalendarClock className="h-3 w-3 mr-1" /> Programada</>)
                            : 'Publicada'
                        )}
                        {row.status === 'rejected' && 'Rechazada'}
                        {row.status === 'removed' && (<><Ban className="h-3 w-3 mr-1" /> Eliminada</>)}
                      </Badge>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {row.artist_name}
                      {row.album_title ? ` · ${row.album_title}` : ''}
                      {' · '}{formatDuration(row.duration_seconds)}
                      {' · '}{new Date(row.created_at).toLocaleString('es-ES')}
                      {row.status === 'approved' && row.scheduled_release_at && (
                        <> · 📅 lanza {formatMadrid(row.scheduled_release_at)} (Madrid)</>
                      )}
                    </p>
                  </div>
                </div>
                {(
                  <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
                    <Button size="sm" variant="outline" onClick={() => openDetails(row)}>
                      <Info className="h-4 w-4 mr-1" /> Detalles
                    </Button>
                    {row.status === 'pending' && (
                      <>
                        <Button size="sm" onClick={() => openApprove(row)}>
                          <Check className="h-4 w-4 mr-1" /> Aprobar
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => openReject(row)}>
                          <X className="h-4 w-4 mr-1" /> Rechazar
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Audio completo
                    </span>
                    {!signedUrls[row.id]?.track && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={loadingAudio[row.id] === 'track'}
                        onClick={() => loadAndPlay(row.id, 'track', row.track_path, row.track_url)}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        {loadingAudio[row.id] === 'track' ? 'Cargando…' : 'Cargar y reproducir'}
                      </Button>
                    )}
                  </div>
                  {signedUrls[row.id]?.track && (
                    <audio
                      ref={(el) => { audioRefs.current[`${row.id}:track`] = el; }}
                      src={signedUrls[row.id]!.track}
                      controls
                      preload="metadata"
                      className="w-full"
                    />
                  )}
                </div>

                {(row.preview_url || row.preview_path) && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Preview (20s)
                      </span>
                      {!signedUrls[row.id]?.preview && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={loadingAudio[row.id] === 'preview'}
                          onClick={() => loadAndPlay(row.id, 'preview', row.preview_path, row.preview_url)}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          {loadingAudio[row.id] === 'preview' ? 'Cargando…' : 'Cargar y reproducir'}
                        </Button>
                      )}
                    </div>
                    {signedUrls[row.id]?.preview && (
                      <audio
                        ref={(el) => { audioRefs.current[`${row.id}:preview`] = el; }}
                        src={signedUrls[row.id]!.preview}
                        controls
                        preload="metadata"
                        className="w-full"
                      />
                    )}
                  </div>
                )}

                {row.status === 'rejected' && row.rejection_reason && (() => {
                  const items = parseRejectionReason(row.rejection_reason);
                  return (
                    <div className="text-xs text-destructive">
                      <p className="font-semibold mb-1">
                        Su lanzamiento no se puede llevar a cabo por los siguientes motivos:
                      </p>
                      <ul className="list-disc pl-5 space-y-0.5 marker:text-destructive">
                        {(items.length > 0 ? items : [row.rejection_reason!]).map((it, i) => (
                          <li key={i}>{it}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}
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
              Escribe <strong>un motivo por línea</strong> para que se muestre como lista.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder={'Motivos del rechazo (uno por línea)\n\nEj.:\n- La calidad del audio es baja\n- La portada no cumple las dimensiones mínimas\n- El título contiene errores'}
            rows={6}
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

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalles del envío</DialogTitle>
            <DialogDescription>
              Información rellenada por el artista en el formulario.
            </DialogDescription>
          </DialogHeader>
          {detailsTarget && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-20 h-20 rounded-md bg-muted overflow-hidden flex items-center justify-center flex-shrink-0">
                  {detailsTarget.cover_url ? (
                    <img src={detailsTarget.cover_url} alt={detailsTarget.title} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{detailsTarget.title}</p>
                  <p className="text-xs text-muted-foreground">{detailsTarget.artist_name}</p>
                </div>
              </div>

              <dl className="grid grid-cols-3 gap-x-3 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Título</dt>
                <dd className="col-span-2 font-medium">{detailsTarget.title}</dd>

                <dt className="text-muted-foreground">Artista</dt>
                <dd className="col-span-2 font-medium">{detailsTarget.artist_name}</dd>

                <dt className="text-muted-foreground">Álbum</dt>
                <dd className="col-span-2">{detailsTarget.album_title || <span className="text-muted-foreground">—</span>}</dd>

                <dt className="text-muted-foreground">Género</dt>
                <dd className="col-span-2">{detailsTarget.genre || <span className="text-muted-foreground">—</span>}</dd>

                <dt className="text-muted-foreground">Fecha lanzamiento</dt>
                <dd className="col-span-2">
                  {detailsTarget.release_date
                    ? new Date(detailsTarget.release_date).toLocaleDateString('es-ES')
                    : <span className="text-muted-foreground">—</span>}
                </dd>

                <dt className="text-muted-foreground">Duración</dt>
                <dd className="col-span-2">{formatDuration(detailsTarget.duration_seconds)}</dd>

                <dt className="text-muted-foreground">Estado</dt>
                <dd className="col-span-2 capitalize">{detailsTarget.status}</dd>

                <dt className="text-muted-foreground">Enviado</dt>
                <dd className="col-span-2">{new Date(detailsTarget.created_at).toLocaleString('es-ES')}</dd>

                {detailsTarget.reviewed_at && (
                  <>
                    <dt className="text-muted-foreground">Revisado</dt>
                    <dd className="col-span-2">{new Date(detailsTarget.reviewed_at).toLocaleString('es-ES')}</dd>
                  </>
                )}
              </dl>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ApproveSubmissionDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        defaultReleaseDate={approveTarget?.release_date ?? null}
        songTitle={approveTarget?.title ?? ''}
        onConfirm={confirmApprove}
      />
    </div>
  );
};

export default SongSubmissions;
