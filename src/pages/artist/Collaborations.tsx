import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Coins, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useModeStore } from '@/stores/modeStore';
import { toast } from 'sonner';
import { formatEURNumber, formatXAFNumber } from '@/lib/currency';
import { useLanguageStore } from '@/stores/languageStore';

interface PendingCollab {
  collaborator_id: string;
  song_id: string;
  song_title: string;
  song_cover_url: string | null;
  artist_name: string;
  share_percent: number;
  estimated_revenue_cents: number;
  downloads: number;
  has_pending_claim: boolean;
}

interface MyClaim {
  id: string;
  collaborator_id: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
}

const formatEuros = (cents: number) => formatEURNumber((cents || 0) / 100);
const formatEurosWithXaf = (cents: number) => {
  const eur = (cents || 0) / 100;
  return `${formatEURNumber(eur)} (${formatXAFNumber(eur)})`;
};

const Collaborations = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { isArtist } = useModeStore();
  const { t, language } = useLanguageStore();
  const [pending, setPending] = useState<PendingCollab[]>([]);
  const [myClaims, setMyClaims] = useState<MyClaim[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: pool, error: poolErr }, { data: claims }] = await Promise.all([
      supabase.rpc('get_pending_collaborations_for_artist' as any),
      supabase.from('collaboration_claims')
        .select('id,collaborator_id,status,rejection_reason,created_at,reviewed_at')
        .eq('claimant_user_id', user.id)
        .order('created_at', { ascending: false }),
    ]);
    if (poolErr) toast.error(t('artist.errorLoadingPool'));
    setPending((pool ?? []) as PendingCollab[]);
    setMyClaims((claims ?? []) as MyClaim[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  // Realtime: refrescar al cambiar mis solicitudes de colaboración (aprobadas/rechazadas)
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`collab-claims-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'collaboration_claims',
          filter: `claimant_user_id=eq.${user.id}`,
        },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const claim = async (collaboratorId: string) => {
    const { data, error } = await supabase.rpc('claim_collaboration' as any, {
      p_collaborator_id: collaboratorId,
    });
    if (error) return toast.error(error.message);
    const r = (data as any)?.[0];
    if (r?.success) {
      toast.success(r.message);
      load();
    } else {
      toast.error(r?.message ?? t('common.error'));
    }
  };

  const totalPending = pending.reduce((acc, p) => acc + p.estimated_revenue_cents, 0);

  if (!isArtist) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card><CardContent className="p-6">No tienes acceso al panel de artista.</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => navigate('/artist')} className="-ml-3">
          <ArrowLeft className="h-4 w-4 mr-2" /> Panel artista
        </Button>
        <span className="text-xs text-muted-foreground">Colaboraciones</span>
      </div>

      <div className="blob-card p-6 mb-6">
        <p className="eyebrow mb-1">Reclama tus splits</p>
        <h1 className="display-xl text-3xl">Pozo común de colaboraciones</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Aquí aparecen las canciones donde otro artista te ha incluido como colaborador. Reclama tu parte y un administrador la revisará.
        </p>
      </div>

      <Card className="mb-6">
        <CardContent className="p-5 flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2"><Coins className="h-5 w-5 text-primary" /></div>
          <div>
            <p className="text-xs text-muted-foreground">Total estimado pendiente de reclamar</p>
            <p className="text-2xl font-bold leading-tight">{formatEuros(totalPending)}</p>
            <p className="text-xs text-muted-foreground/80 tabular-nums">{formatXAFNumber(totalPending / 100)}</p>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
      ) : pending.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
            No hay colaboraciones pendientes a tu nombre artístico.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pending.map((p) => (
            <Card key={p.collaborator_id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-14 h-14 rounded-md bg-muted overflow-hidden flex-shrink-0">
                  {p.song_cover_url && (
                    <img src={p.song_cover_url} alt={p.song_title} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold truncate">{p.song_title}</h3>
                    <Badge variant="secondary">{p.share_percent}%</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Como <strong>{p.artist_name}</strong> · {p.downloads} descargas · estimado: {formatEurosWithXaf(p.estimated_revenue_cents)}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <Button
                    size="sm"
                    onClick={() => claim(p.collaborator_id)}
                    disabled={p.has_pending_claim}
                  >
                    {p.has_pending_claim ? 'Reclamada' : 'Reclamar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {myClaims.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Mis solicitudes
          </h2>
          <div className="space-y-2">
            {myClaims.map((c) => (
              <Card key={c.id}>
                <CardContent className="p-3 flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString('es-ES')}
                  </span>
                  {c.status === 'pending' && <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>}
                  {c.status === 'approved' && <Badge className="bg-primary"><CheckCircle2 className="h-3 w-3 mr-1" />Aprobada</Badge>}
                  {c.status === 'rejected' && (
                    <Badge variant="destructive" title={c.rejection_reason ?? ''}>
                      <AlertCircle className="h-3 w-3 mr-1" />Rechazada
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Collaborations;
