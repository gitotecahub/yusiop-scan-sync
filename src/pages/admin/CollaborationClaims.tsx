import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Check, X, Clock, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ClaimRow {
  id: string;
  collaborator_id: string;
  claimant_user_id: string;
  claimant_artist_name: string;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
  // joined
  song_id?: string | null;
  song_title?: string | null;
  song_cover_url?: string | null;
  share_percent?: number | null;
  collab_artist_name?: string | null;
  claimant_email?: string | null;
}

const CollaborationClaims = () => {
  const [rows, setRows] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<ClaimRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from('collaboration_claims')
      .select('id,collaborator_id,claimant_user_id,claimant_artist_name,message,status,rejection_reason,created_at,reviewed_at')
      .order('created_at', { ascending: false });
    if (filter !== 'all') q = q.eq('status', filter);
    const { data: claims } = await q;

    if (!claims || claims.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    // Cargar info de cada colaborador + canción
    const collabIds = claims.map(c => c.collaborator_id);
    const { data: collabs } = await supabase
      .from('song_collaborators')
      .select('id,song_id,artist_name,share_percent')
      .in('id', collabIds);

    const songIds = (collabs ?? []).map(c => c.song_id).filter(Boolean) as string[];
    const { data: songs } = songIds.length > 0
      ? await supabase.from('songs').select('id,title,cover_url').in('id', songIds)
      : { data: [] };

    const collabMap = new Map((collabs ?? []).map(c => [c.id, c]));
    const songMap = new Map((songs ?? []).map(s => [s.id, s]));

    const enriched: ClaimRow[] = claims.map(c => {
      const co = collabMap.get(c.collaborator_id);
      const so = co?.song_id ? songMap.get(co.song_id) : null;
      return {
        ...c,
        collab_artist_name: co?.artist_name ?? null,
        share_percent: co?.share_percent != null ? Number(co.share_percent) : null,
        song_id: co?.song_id ?? null,
        song_title: so?.title ?? null,
        song_cover_url: so?.cover_url ?? null,
      };
    });

    setRows(enriched);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const approve = async (row: ClaimRow) => {
    const { data, error } = await supabase.rpc('resolve_collaboration_claim' as any, {
      p_claim_id: row.id,
      p_approve: true,
    });
    if (error) return toast.error(error.message);
    const r = (data as any)?.[0];
    if (r?.success) { toast.success(r.message); load(); }
    else toast.error(r?.message ?? 'Error');
  };

  const openReject = (row: ClaimRow) => {
    setRejectTarget(row);
    setRejectReason('');
    setRejectOpen(true);
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    const { data, error } = await supabase.rpc('resolve_collaboration_claim' as any, {
      p_claim_id: rejectTarget.id,
      p_approve: false,
      p_reason: rejectReason.trim() || null,
    });
    if (error) return toast.error(error.message);
    const r = (data as any)?.[0];
    if (r?.success) {
      toast.success(r.message);
      setRejectOpen(false);
      load();
    } else {
      toast.error(r?.message ?? 'Error');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" /> Reclamaciones de colaboración
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Aprueba o rechaza las solicitudes de artistas que reclaman su parte de monetización en colaboraciones.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
          <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)}>
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
        <Card><CardContent className="py-10 text-center text-muted-foreground">
          No hay reclamaciones en este filtro.
        </CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {rows.map(row => (
            <Card key={row.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-md bg-muted overflow-hidden flex-shrink-0">
                    {row.song_cover_url && (
                      <img src={row.song_cover_url} alt={row.song_title ?? ''} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2 flex-wrap">
                      {row.song_title ?? 'Canción eliminada'}
                      {row.share_percent != null && <Badge variant="secondary">{row.share_percent}%</Badge>}
                      {row.status === 'pending' && <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>}
                      {row.status === 'approved' && <Badge>Aprobada</Badge>}
                      {row.status === 'rejected' && <Badge variant="destructive">Rechazada</Badge>}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      Reclama: <strong>{row.claimant_artist_name}</strong>
                      {row.collab_artist_name && row.collab_artist_name.toLowerCase() !== row.claimant_artist_name.toLowerCase() && (
                        <> · split a nombre de "{row.collab_artist_name}"</>
                      )}
                      {' · '}{new Date(row.created_at).toLocaleString('es-ES')}
                    </p>
                  </div>
                </div>
                {row.status === 'pending' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="sm" onClick={() => approve(row)}><Check className="h-4 w-4 mr-1" />Aprobar</Button>
                    <Button size="sm" variant="destructive" onClick={() => openReject(row)}><X className="h-4 w-4 mr-1" />Rechazar</Button>
                  </div>
                )}
              </CardHeader>
              {row.message && (
                <CardContent>
                  <p className="text-sm bg-muted/50 rounded-md p-3 italic">"{row.message}"</p>
                </CardContent>
              )}
              {row.status === 'rejected' && row.rejection_reason && (
                <CardContent>
                  <p className="text-xs text-destructive">Motivo: {row.rejection_reason}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar reclamación</DialogTitle>
            <DialogDescription>
              Indica al artista por qué no se aprueba su reclamación. Recibirá una notificación.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Motivo del rechazo (opcional)"
            rows={4}
            maxLength={500}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmReject}>Rechazar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CollaborationClaims;
