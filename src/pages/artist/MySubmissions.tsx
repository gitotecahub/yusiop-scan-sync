import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import SubmitSongDialog from '@/components/artist/SubmitSongDialog';

interface SubmissionRow {
  id: string;
  title: string;
  artist_name: string;
  album_title: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  cover_url: string | null;
  created_at: string;
  reviewed_at: string | null;
}

const MySubmissions = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [defaultName, setDefaultName] = useState('');

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('song_submissions')
      .select('id,title,artist_name,album_title,status,rejection_reason,cover_url,created_at,reviewed_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setRows((data ?? []) as SubmissionRow[]);
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('artist_requests')
        .select('artist_name')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .order('reviewed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.artist_name) setDefaultName(data.artist_name);
    };
    init();
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => navigate('/artist')} className="-ml-3">
          <ArrowLeft className="h-4 w-4 mr-2" /> Panel artista
        </Button>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Subir música
        </Button>
      </div>

      <div className="blob-card p-6 mb-6">
        <p className="eyebrow mb-1">Mis envíos</p>
        <h1 className="display-xl text-3xl">Canciones enviadas</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Sigue el estado de revisión de tus envíos al catálogo.
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Aún no has enviado ninguna canción. Pulsa “Subir música” para empezar.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-14 h-14 rounded-md bg-muted overflow-hidden flex-shrink-0">
                  {r.cover_url ? (
                    <img src={r.cover_url} alt={r.title} className="w-full h-full object-cover" />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold truncate">{r.title}</h3>
                    {r.status === 'pending' && (
                      <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />En revisión</Badge>
                    )}
                    {r.status === 'approved' && (
                      <Badge className="bg-green-600 hover:bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Publicada</Badge>
                    )}
                    {r.status === 'rejected' && (
                      <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rechazada</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {r.artist_name}{r.album_title ? ` · ${r.album_title}` : ''} · {new Date(r.created_at).toLocaleString('es-ES')}
                  </p>
                  {r.status === 'rejected' && r.rejection_reason && (
                    <p className="text-xs text-destructive mt-2">
                      <span className="font-semibold">Motivo:</span> {r.rejection_reason}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SubmitSongDialog
        open={open}
        onOpenChange={setOpen}
        defaultArtistName={defaultName}
        onSubmitted={load}
      />
    </div>
  );
};

export default MySubmissions;
