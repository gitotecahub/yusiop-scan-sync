import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Download, Music, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserDownload {
  id: string;
  user_id: string | null;
  song_id: string;
  qr_card_id: string | null;
  downloaded_at: string;
  card_type: string | null;
  user_email: string | null;
  songs?: { title: string; artists?: { name: string } };
}

const Downloads = () => {
  const [downloads, setDownloads] = useState<UserDownload[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchDownloads();
  }, []);

  const fetchDownloads = async () => {
    try {
      const { data, error } = await supabase
        .from('user_downloads')
        .select(`
          *,
          songs(
            title,
            artists(name)
          )
        `)
        .order('downloaded_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching downloads:', error);
        return;
      }

      setDownloads(data || []);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredDownloads = downloads.filter(download =>
    download.songs?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    download.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    download.songs?.artists?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Historial de Descargas</h1>
        <p className="text-muted-foreground">
          Monitorea las descargas de música en la plataforma
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar Descargas</CardTitle>
          <CardDescription>
            Encuentra descargas por canción, usuario o artista
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar descargas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Estadísticas de Descargas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gradient-to-r from-yusiop-primary/10 to-yusiop-accent/10 rounded-lg">
              <Download className="h-8 w-8 mx-auto mb-2 text-yusiop-primary" />
              <p className="text-2xl font-bold">{downloads.length}</p>
              <p className="text-sm text-muted-foreground">Descargas Totales</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-r from-blue-500/10 to-blue-600/10 rounded-lg">
              <User className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold">
                {new Set(downloads.map(d => d.user_email || d.user_id)).size}
              </p>
              <p className="text-sm text-muted-foreground">Usuarios Únicos</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-r from-green-500/10 to-green-600/10 rounded-lg">
              <Music className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">
                {new Set(downloads.map(d => d.song_id)).size}
              </p>
              <p className="text-sm text-muted-foreground">Canciones Únicas</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filteredDownloads.map((download) => (
          <Card key={download.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-yusiop-primary to-yusiop-accent rounded-lg flex items-center justify-center">
                    <Download className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{download.songs?.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {download.songs?.artists?.name}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="outline">
                        {download.user_email || 'Usuario anónimo'}
                      </Badge>
                      {download.card_type && (
                        <Badge variant="secondary">{download.card_type}</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {formatDate(download.downloaded_at)}
                  </p>
                  {download.qr_card_id && (
                    <p className="text-xs text-muted-foreground">
                      Vía código QR
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredDownloads.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No se encontraron descargas</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Downloads;