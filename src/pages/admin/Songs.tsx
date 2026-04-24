import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Play, Edit, Trash2, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import UploadSongDialog from '@/components/admin/UploadSongDialog';
import { formatMadrid, timeUntil } from '@/lib/madridTime';

interface Collaborator {
  id: string;
  artist_name: string;
  role: string;
  share_percent: number;
  is_primary: boolean;
  claimed_by_user_id: string | null;
}

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
  scheduled_release_at: string | null;
  artists?: { name: string };
  albums?: { title: string };
  song_collaborators?: Collaborator[];
}

interface Artist {
  id: string;
  name: string;
}

interface Album {
  id: string;
  title: string;
  cover_url?: string;
}

const Songs = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSongs();
    fetchArtists();
    fetchAlbums();
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

      const songIds = (data || []).map((s) => s.id);
      let collabsBySong: Record<string, Collaborator[]> = {};
      if (songIds.length > 0) {
        const { data: collabs } = await supabase
          .from('song_collaborators')
          .select('id, song_id, artist_name, role, share_percent, is_primary, claimed_by_user_id')
          .in('song_id', songIds);
        (collabs || []).forEach((c: any) => {
          if (!c.song_id) return;
          if (!collabsBySong[c.song_id]) collabsBySong[c.song_id] = [];
          collabsBySong[c.song_id].push(c);
        });
      }

      const enriched: Song[] = (data || []).map((s: any) => ({
        ...s,
        song_collaborators: (collabsBySong[s.id] || []).sort(
          (a, b) => Number(b.is_primary) - Number(a.is_primary) || b.share_percent - a.share_percent
        ),
      }));
      setSongs(enriched);
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

  const fetchAlbums = async () => {
    try {
      const { data, error } = await supabase
        .from('albums')
        .select('id, title, cover_url')
        .order('title');

      if (error) {
        console.error('Error fetching albums:', error);
        return;
      }

      setAlbums(data || []);
    } catch (error) {
      console.error('Error fetching albums:', error);
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
        <Button onClick={() => setUploadDialogOpen(true)}>
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
                    <div className="flex items-center flex-wrap gap-2 mt-1">
                      {song.albums?.title && (
                        <Badge variant="outline">{song.albums.title}</Badge>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {formatDuration(song.duration_seconds)}
                      </span>
                      {song.preview_url && (
                        <Badge variant="secondary">Preview</Badge>
                      )}
                      {song.track_url && (
                        <Badge variant="secondary">Full Track</Badge>
                      )}
                      {song.scheduled_release_at && new Date(song.scheduled_release_at) > new Date() && (
                        <Badge className="bg-primary/10 text-primary border-primary/30 hover:bg-primary/20 gap-1">
                          <Clock className="h-3 w-3" />
                          Programado · {formatMadrid(song.scheduled_release_at)} · {timeUntil(song.scheduled_release_at)}
                        </Badge>
                      )}
                    </div>
                    {song.song_collaborators && song.song_collaborators.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground mb-1">Colaboradores / Reparto:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {song.song_collaborators.map((c) => (
                            <Badge
                              key={c.id}
                              variant={c.is_primary ? 'default' : 'outline'}
                              className="text-xs"
                            >
                              {c.is_primary && '★ '}
                              {c.artist_name} · {c.role} · {c.share_percent}%
                              {!c.claimed_by_user_id && ' · sin reclamar'}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
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

      {/* Upload Dialog */}
      <UploadSongDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onSongUploaded={fetchSongs}
        artists={artists}
        albums={albums}
      />
    </div>
  );
};

export default Songs;