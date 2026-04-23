import { useEffect, useState } from 'react';
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
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X, FileText, ExternalLink, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface ArtistRequestRow {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  artist_name: string;
  bio: string | null;
  genre: string | null;
  contact_email: string | null;
  links: any;
  document_urls: any;
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
}

const ArtistRequests = () => {
  const [rows, setRows] = useState<ArtistRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<ArtistRequestRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = async () => {
    setLoading(true);
    let q = supabase.from('artist_requests').select('*').order('created_at', { ascending: false });
    if (filter !== 'all') q = q.eq('status', filter);
    const { data, error } = await q;
    if (error) toast.error('Error cargando solicitudes');
    setRows((data ?? []) as ArtistRequestRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const approve = async (row: ArtistRequestRow) => {
    const { data, error } = await supabase.rpc('approve_artist_request', { p_request_id: row.id });
    if (error) return toast.error(error.message);
    const result = (data as any)?.[0];
    if (result?.success) {
      toast.success(result.message);
      load();
    } else {
      toast.error(result?.message ?? 'Error');
    }
  };

  const openReject = (row: ArtistRequestRow) => {
    setRejectTarget(row);
    setRejectReason('');
    setRejectOpen(true);
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    const { data, error } = await supabase.rpc('reject_artist_request', {
      p_request_id: rejectTarget.id,
      p_reason: rejectReason.trim() || null,
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

  const openDoc = async (path: string) => {
    const { data, error } = await supabase.storage
      .from('artist-documents')
      .createSignedUrl(path, 60 * 5);
    if (error || !data) return toast.error('No se pudo abrir el documento');
    window.open(data.signedUrl, '_blank');
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Solicitudes de artista</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Revisa, aprueba o rechaza las solicitudes para acceder al panel de artista.
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
            No hay solicitudes en este filtro.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rows.map((row) => {
            const linkList: string[] = Array.isArray(row.links) ? row.links : [];
            const docList: { path: string; name: string }[] = Array.isArray(row.document_urls)
              ? row.document_urls
              : [];
            return (
              <Card key={row.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {row.artist_name}
                      <Badge
                        variant={
                          row.status === 'approved'
                            ? 'default'
                            : row.status === 'rejected'
                              ? 'destructive'
                              : 'secondary'
                        }
                      >
                        {row.status === 'pending' && (
                          <>
                            <Clock className="h-3 w-3 mr-1" /> Pendiente
                          </>
                        )}
                        {row.status === 'approved' && 'Aprobada'}
                        {row.status === 'rejected' && 'Rechazada'}
                      </Badge>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {row.contact_email} · {new Date(row.created_at).toLocaleString('es-ES')}
                    </p>
                  </div>
                  {row.status === 'pending' && (
                    <div className="flex gap-2">
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
                  {row.genre && <p><span className="font-semibold">Género:</span> {row.genre}</p>}
                  {row.bio && <p className="text-muted-foreground whitespace-pre-wrap">{row.bio}</p>}

                  {linkList.length > 0 && (
                    <div>
                      <p className="font-semibold text-xs mb-1">Enlaces</p>
                      <ul className="space-y-1">
                        {linkList.map((l, i) => (
                          <li key={i}>
                            <a
                              href={l.startsWith('http') ? l : `https://${l}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline inline-flex items-center gap-1"
                            >
                              {l} <ExternalLink className="h-3 w-3" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {docList.length > 0 && (
                    <div>
                      <p className="font-semibold text-xs mb-1">Documentos ({docList.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {docList.map((d) => (
                          <Button
                            key={d.path}
                            size="sm"
                            variant="outline"
                            onClick={() => openDoc(d.path)}
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            {d.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {row.status === 'rejected' && row.rejection_reason && (
                    <div className="text-xs text-destructive">
                      <span className="font-semibold">Motivo de rechazo:</span> {row.rejection_reason}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar solicitud</DialogTitle>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Motivo (opcional, se mostrará al artista)"
            rows={4}
            maxLength={500}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmReject}>
              Rechazar solicitud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ArtistRequests;
