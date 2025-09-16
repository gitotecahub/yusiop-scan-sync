import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Edit, Trash2, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import UploadAlbumDialog from '@/components/admin/UploadAlbumDialog';

interface Album {
  id: string;
  title: string;
  artist_id: string;
  cover_url: string | null;
  release_date: string | null;
  created_at: string;
  artists?: { name: string };
}

interface Artist {
  id: string;
  name: string;
}

const Albums = () => {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAlbums();
    fetchArtists();
  }, []);

  const fetchAlbums = async () => {
    try {
      const { data, error } = await supabase
        .from('albums')
        .select(`
          *,
          artists(name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching albums:', error);
        return;
      }

      setAlbums(data || []);
    } catch (error) {
      console.error('Error fetching albums:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los álbumes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchArtists = async () => {
    try {
      const { data, error } = await supabase
        .from('artists')
        .select('id, name')
        .order('name');

      if (error) {
        console.error('Error fetching artists:', error);
        return;
      }

      setArtists(data || []);
    } catch (error) {
      console.error('Error fetching artists:', error);
    }
  };

  const deleteAlbum = async (albumId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este álbum?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('albums')
        .delete()
        .eq('id', albumId);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Álbum eliminado correctamente',
      });

      fetchAlbums();
    } catch (error) {
      console.error('Error deleting album:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el álbum',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No especificada';
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  const filteredAlbums = albums.filter(album =>
    album.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    album.artists?.name.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-3xl font-bold">Gestión de Álbumes</h1>
          <p className="text-muted-foreground">
            Administra los álbumes de la plataforma
          </p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Álbum
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar Álbumes</CardTitle>
          <CardDescription>
            Encuentra álbumes por título o artista
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar álbumes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredAlbums.map((album) => (
          <Card key={album.id}>
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="aspect-square relative">
                  {album.cover_url ? (
                    <img
                      src={album.cover_url}
                      alt={album.title}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-yusiop-primary to-yusiop-accent rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-2xl">
                        {album.title.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                
                <div>
                  <h3 className="font-semibold text-lg truncate">{album.title}</h3>
                  <p className="text-muted-foreground">{album.artists?.name}</p>
                  
                  <div className="flex items-center space-x-2 mt-2">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {formatDate(album.release_date)}
                    </span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteAlbum(album.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAlbums.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No se encontraron álbumes</p>
          </CardContent>
        </Card>
      )}

      {/* Upload Album Dialog */}
      <UploadAlbumDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onAlbumUploaded={() => {
          fetchAlbums();
          fetchArtists();
        }}
        artists={artists}
      />
    </div>
  );
};

export default Albums;