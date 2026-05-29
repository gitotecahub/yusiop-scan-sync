import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Plus, Share2, Trash2, MoreVertical, Edit, Play, Music2, GripVertical, Globe, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { usePlayerStore } from '@/stores/playerStore';
import AddSongsDialog from '@/components/playlists/AddSongsDialog';
import CreatePlaylistDialog from '@/components/playlists/CreatePlaylistDialog';

interface Track {
  id: string;
  song_id: string;
  position: number;
  title: string;
  artist: string;
  cover_url?: string;
  track_url?: string;
  preview_url?: string;
  duration_seconds: number;
}

interface PlaylistRow {
  id: string; user_id: string; title: string; description: string | null;
  cover_url: string | null; is_public: boolean; share_token: string;
}

export default function PlaylistDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [playlist, setPlaylist] = useState<PlaylistRow | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const setQueue = usePlayerStore((s) => s.setQueue);
  const play = usePlayerStore((s) => s.play);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: pl, error: e1 } = await supabase.from('playlists').select('*').eq('id', id).single();
      if (e1) throw e1;
      setPlaylist(pl as any);

      const { data: tr } = await supabase
        .from('playlist_tracks')
        .select('id, song_id, position, songs!inner(id, title, duration_seconds, cover_url, track_url, preview_url, artists!inner(name), albums(cover_url))')
        .eq('playlist_id', id)
        .order('position', { ascending: true });

      setTracks((tr || []).map((t: any) => ({
        id: t.id,
        song_id: t.song_id,
        position: t.position,
        title: t.songs.title,
        artist: t.songs.artists.name,
        cover_url: t.songs.cover_url || t.songs.albums?.cover_url,
        track_url: t.songs.track_url,
        preview_url: t.songs.preview_url,
        duration_seconds: t.songs.duration_seconds,
      })));
    } catch (e: any) {
      console.error(e);
      toast.error('No se pudo cargar la playlist');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const playAll = () => {
    if (tracks.length === 0) return;
    const queue = tracks.map((t) => ({
      id: t.song_id, title: t.title, artist: t.artist,
      cover_url: t.cover_url, track_url: t.track_url, preview_url: t.preview_url,
      duration_seconds: t.duration_seconds, is_favorite: false, downloaded_at: '',
    } as any));
    setQueue(queue, 0, false);
    play();
  };

  const playOne = (idx: number) => {
    const queue = tracks.map((t) => ({
      id: t.song_id, title: t.title, artist: t.artist,
      cover_url: t.cover_url, track_url: t.track_url, preview_url: t.preview_url,
      duration_seconds: t.duration_seconds, is_favorite: false, downloaded_at: '',
    } as any));
    setQueue(queue, idx, false);
    play();
  };

  const removeTrack = async (trackId: string) => {
    const { error } = await supabase.from('playlist_tracks').delete().eq('id', trackId);
    if (error) { toast.error('No se pudo quitar'); return; }
    setTracks((p) => p.filter((t) => t.id !== trackId));
  };

  const deletePlaylist = async () => {
    if (!confirm('¿Eliminar esta playlist?')) return;
    const { error } = await supabase.from('playlists').delete().eq('id', id!);
    if (error) { toast.error('Error al eliminar'); return; }
    toast.success('Playlist eliminada');
    nav('/library?tab=playlists');
  };

  const share = async () => {
    if (!playlist) return;
    const url = `${window.location.origin}/p/${playlist.share_token}`;
    try {
      if (navigator.share) await navigator.share({ title: playlist.title, url });
      else { await navigator.clipboard.writeText(url); toast.success('Enlace copiado'); }
    } catch {}
  };

  const move = async (from: number, to: number) => {
    if (to < 0 || to >= tracks.length) return;
    const next = [...tracks];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setTracks(next);
    // Persist positions
    await Promise.all(next.map((t, i) =>
      supabase.from('playlist_tracks').update({ position: i }).eq('id', t.id)
    ));
  };

  if (loading || !playlist) {
    return <div className="py-12 text-center text-muted-foreground">Cargando…</div>;
  }

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => nav(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1" />
        <Button variant="ghost" size="icon" onClick={share}><Share2 className="h-5 w-5" /></Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditOpen(true)}><Edit className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
            <DropdownMenuItem onClick={deletePlaylist} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Eliminar</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-28 h-28 rounded-2xl overflow-hidden vapor-bg shrink-0">
          {tracks.length > 0 ? (
            <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
              {tracks.slice(0, 4).map((t, i) => (
                <div key={i} className="bg-muted overflow-hidden">
                  {t.cover_url && <img src={t.cover_url} alt="" className="w-full h-full object-cover" />}
                </div>
              ))}
            </div>
          ) : <div className="w-full h-full flex items-center justify-center"><Music2 className="h-10 w-10 text-white/70" /></div>}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-bold leading-tight">{playlist.title}</h1>
          {playlist.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{playlist.description}</p>}
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            {playlist.is_public ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
            <span>{tracks.length} canciones</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={playAll} disabled={tracks.length === 0} className="vapor-bg flex-1">
          <Play className="h-4 w-4 mr-1 fill-current" /> Reproducir
        </Button>
        <Button onClick={() => setAddOpen(true)} variant="outline">
          <Plus className="h-4 w-4 mr-1" /> Añadir
        </Button>
      </div>

      {tracks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Music2 className="h-10 w-10 mx-auto mb-2" />
          <p className="text-sm">Esta playlist está vacía</p>
          <Button onClick={() => setAddOpen(true)} variant="link" className="mt-2">Añadir canciones</Button>
        </div>
      ) : (
        <ul className="space-y-1">
          {tracks.map((t, idx) => (
            <li key={t.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/40">
              <button onClick={() => playOne(idx)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                <img src={t.cover_url || 'https://picsum.photos/64'} alt="" className="w-10 h-10 rounded object-cover" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{t.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{t.artist}</div>
                </div>
              </button>
              <button onClick={() => move(idx, idx - 1)} disabled={idx === 0} className="text-muted-foreground disabled:opacity-30 p-1" aria-label="Subir">▲</button>
              <button onClick={() => move(idx, idx + 1)} disabled={idx === tracks.length - 1} className="text-muted-foreground disabled:opacity-30 p-1" aria-label="Bajar">▼</button>
              <button onClick={() => removeTrack(t.id)} className="text-destructive p-1" aria-label="Quitar"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}

      <AddSongsDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        playlistId={playlist.id}
        existingSongIds={tracks.map((t) => t.song_id)}
        onAdded={load}
      />
      <CreatePlaylistDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        initial={{ id: playlist.id, title: playlist.title, description: playlist.description, is_public: playlist.is_public }}
        onCreated={load}
      />
    </div>
  );
}
