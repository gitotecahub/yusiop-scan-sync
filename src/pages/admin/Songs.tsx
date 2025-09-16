import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Play, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Song {
  id: string;
  title: string;
  artist_id: string;
  album_id: string | null;
  duration_seconds: number;
  preview_url: string | null;
  track_url: string | null;
  cover_url: string | null;
  created_at: string;
  artists?: { name: string };
  albums?: { title: string };
}

const Songs = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchSongs();
  }, []);

  const fetchSongs = async () => {
    try {
      const { data, error } = await supabase
        .from('songs')
        .select(`
          *,
          artists(name),
          albums(title)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching songs:', error);
        return;
      }

      setSongs(data || []);
    } catch (error) {
      console.error('Error fetching songs:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las canciones',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteSong = async (songId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta canción?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('songs')
        .delete()
        .eq('id', songId);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Canción eliminada correctamente',
      });

      fetchSongs();
    } catch (error) {
      console.error('Error deleting song:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la canción',
        variant: 'destructive',
      });
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const filteredSongs = songs.filter(song =>
    song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    song.artists?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Canciones</h1>
          <p className="text-muted-foreground">
            Administra el catálogo musical de la plataforma
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Canción
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar Canciones</CardTitle>
          <CardDescription>
            Encuentra canciones por título o artista
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar canciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filteredSongs.map((song) => (
          <Card key={song.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-yusiop-primary to-yusiop-accent rounded-lg flex items-center justify-center">
                    {song.cover_url ? (
                      <img
                        src={song.cover_url}
                        alt={song.title}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <Play className="h-6 w-6 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{song.title}</h3>
                    <p className="text-muted-foreground">{song.artists?.name}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      {song.albums?.title && (
                        <Badge variant="outline">{song.albums.title}</Badge>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {formatDuration(song.duration_seconds)}
                      </span>
                      <div className="flex space-x-1">
                        {song.preview_url && (
                          <Badge variant="secondary">Preview</Badge>
                        )}
                        {song.track_url && (
                          <Badge variant="secondary">Full Track</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteSong(song.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Eliminar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSongs.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No se encontraron canciones</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Songs;