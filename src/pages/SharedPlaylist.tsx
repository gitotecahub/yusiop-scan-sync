import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Music2, Play, Lock, ShoppingBag, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { usePlayerStore } from '@/stores/playerStore';

interface Track {
  id: string; song_id: string; position: number;
  title: string; artist: string; cover_url?: string;
  track_url?: string; preview_url?: string; duration_seconds: number;
  owned: boolean;
}

export default function SharedPlaylist() {
  const { token } = useParams();
  const nav = useNavigate();
  const [playlistTitle, setPlaylistTitle] = useState('');
  const [description, setDescription] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const setQueue = usePlayerStore((s) => s.setQueue);
  const play = usePlayerStore((s) => s.play);

  useEffect(() => {
    (async () => {
      if (!token) return;
      try {
        const { data: pl, error } = await supabase
          .from('playlists')
          .select('id, title, description, user_id, is_public, share_token')
          .eq('share_token', token)
          .maybeSingle();
        if (error || !pl) { toast.error('Playlist no encontrada'); setLoading(false); return; }

        setPlaylistTitle(pl.title);
        setDescription(pl.description);

        const { data: tr } = await supabase
          .from('playlist_tracks')
          .select('id, song_id, position, songs!inner(id, title, duration_seconds, cover_url, track_url, preview_url, artists!inner(name), albums(cover_url))')
          .eq('playlist_id', pl.id)
          .order('position', { ascending: true });

        const { data: { user } } = await supabase.auth.getUser();
        let ownedIds = new Set<string>();
        if (user && tr) {
          const ids = tr.map((t: any) => t.song_id);
          const { data: dl } = await supabase
            .from('user_downloads').select('song_id').eq('user_id', user.id).in('song_id', ids);
          ownedIds = new Set((dl || []).map((d: any) => d.song_id));
        }

        setTracks((tr || []).map((t: any) => ({
          id: t.id, song_id: t.song_id, position: t.position,
          title: t.songs.title, artist: t.songs.artists.name,
          cover_url: t.songs.cover_url || t.songs.albums?.cover_url,
          track_url: t.songs.track_url, preview_url: t.songs.preview_url,
          duration_seconds: t.songs.duration_seconds,
          owned: ownedIds.has(t.song_id),
        })));
      } finally { setLoading(false); }
    })();
  }, [token]);

  const playSong = (t: Track) => {
    const item = {
      id: t.song_id, title: t.title, artist: t.artist,
      cover_url: t.cover_url, duration_seconds: t.duration_seconds,
      is_favorite: false, downloaded_at: '',
      track_url: t.owned ? t.track_url : (t.preview_url || t.track_url),
      preview_url: t.preview_url,
      previewOnly: !t.owned,
    } as any;
    setQueue([item], 0, !t.owned);
    play();
    if (!t.owned) toast.info('Preview de 20s — desbloquea para escuchar completa', { duration: 3000 });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Cargando…</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto p-5 space-y-5 pb-32">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => nav('/')}><ArrowLeft className="h-5 w-5" /></Button>
          <p className="eyebrow eyebrow-warm">Playlist compartida</p>
        </div>

        <header className="space-y-2">
          <h1 className="font-display text-2xl font-bold">{playlistTitle}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
          <p className="text-xs text-muted-foreground">{tracks.length} canciones</p>
        </header>

        <ul className="space-y-1">
          {tracks.map((t) => (
            <li key={t.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40">
              <button onClick={() => playSong(t)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                <div className="relative">
                  <img src={t.cover_url || 'https://picsum.photos/64'} alt="" className="w-12 h-12 rounded object-cover" />
                  {!t.owned && <div className="absolute inset-0 rounded bg-black/40 flex items-center justify-center"><Lock className="h-4 w-4 text-white" /></div>}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{t.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{t.artist}</div>
                  {!t.owned && <div className="text-[10px] vapor-text mt-0.5">Preview 20s</div>}
                </div>
              </button>
              {t.owned ? (
                <Button size="icon" variant="ghost" onClick={() => playSong(t)} className="text-vapor-cyan"><Play className="h-4 w-4 fill-current" /></Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => nav('/store')} className="text-xs"><ShoppingBag className="h-3 w-3 mr-1" />Desbloquear</Button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
