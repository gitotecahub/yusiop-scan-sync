import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, Disc3, BarChart3, ArrowLeft, Upload, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/stores/authStore';
import { useModeStore } from '@/stores/modeStore';
import { supabase } from '@/integrations/supabase/client';
import SubmitSongDialog from '@/components/artist/SubmitSongDialog';

const ArtistDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { isArtist, setMode } = useModeStore();
  const [artistName, setArtistName] = useState<string>('');
  const [submitOpen, setSubmitOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const loadPending = async () => {
    if (!user) return;
    const { count } = await supabase
      .from('song_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'pending');
    setPendingCount(count ?? 0);
  };

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('artist_requests')
        .select('artist_name')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .order('reviewed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.artist_name) setArtistName(data.artist_name);
    };
    load();
    loadPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!isArtist) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card>
          <CardContent className="p-6 text-center space-y-3">
            <p>No tienes acceso al panel de artista.</p>
            <Button onClick={() => navigate('/artist/request')}>Solicitar perfil de artista</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const switchToUser = async () => {
    if (!user) return;
    await setMode(user.id, 'user');
    navigate('/');
  };

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={switchToUser} className="-ml-3">
          <ArrowLeft className="h-4 w-4 mr-2" /> Modo Usuario
        </Button>
        <span className="text-xs text-muted-foreground">Yusiop Artist</span>
      </div>

      <div className="blob-card p-6 mb-6">
        <p className="eyebrow mb-1">Bienvenido</p>
        <h1 className="display-xl text-3xl">{artistName || 'Artista'}</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Gestiona tu catálogo, sube música y revisa estadísticas.
        </p>
        <div className="mt-4 flex gap-2 flex-wrap">
          <Button onClick={() => setSubmitOpen(true)}>
            <Upload className="h-4 w-4 mr-2" /> Subir música
          </Button>
          <Button variant="outline" onClick={() => navigate('/artist/submissions')}>
            Mis envíos{pendingCount > 0 ? ` (${pendingCount} en revisión)` : ''}
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="hover:shadow-glow transition-shadow cursor-pointer" onClick={() => navigate('/artist/submissions')}>
          <CardContent className="p-6">
            <Music className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-display font-bold text-lg">Mis canciones</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Sube nuevas canciones y consulta el estado de tus envíos.
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-glow transition-shadow cursor-pointer" onClick={() => {}}>
          <CardContent className="p-6">
            <Disc3 className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-display font-bold text-lg">Mis álbumes</h3>
            <p className="text-xs text-muted-foreground mt-1">Crear álbumes y EPs. Próximamente.</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-glow transition-shadow cursor-pointer" onClick={() => navigate('/artist/stats')}>
          <CardContent className="p-6">
            <BarChart3 className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-display font-bold text-lg">Estadísticas</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Descargas, ingresos, países y demografía de tu audiencia.
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-glow transition-shadow cursor-pointer" onClick={() => navigate('/artist/collaborations')}>
          <CardContent className="p-6">
            <Users className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-display font-bold text-lg">Colaboraciones</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Reclama tu parte de monetización en canciones donde apareces como colaborador.
            </p>
          </CardContent>
        </Card>
      </div>

      <SubmitSongDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        defaultArtistName={artistName}
        onSubmitted={loadPending}
      />
    </div>
  );
};

export default ArtistDashboard;
