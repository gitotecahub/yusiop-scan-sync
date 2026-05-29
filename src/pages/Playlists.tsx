import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Music2, ListMusic, Globe, Lock } from 'lucide-react';
import CreatePlaylistDialog from '@/components/playlists/CreatePlaylistDialog';
import { Button } from '@/components/ui/button';

interface Playlist {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  is_public: boolean;
  created_at: string;
  track_count?: number;
  covers?: string[];
}

export default function Playlists() {
  const [list, setList] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('playlists')
        .select('id, title, description, cover_url, is_public, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const ids = (data || []).map((p) => p.id);
      const coversByPlaylist: Record<string, string[]> = {};
      if (ids.length) {
        const { data: tracks } = await supabase
          .from('playlist_tracks')
          .select('playlist_id, position, songs!inner(cover_url, albums(cover_url))')
          .in('playlist_id', ids)
          .order('position', { ascending: true });
        (tracks || []).forEach((t: any) => {
          if (!coversByPlaylist[t.playlist_id]) coversByPlaylist[t.playlist_id] = [];
          const c = t.songs.cover_url || t.songs.albums?.cover_url;
          if (c && coversByPlaylist[t.playlist_id].length < 4) coversByPlaylist[t.playlist_id].push(c);
        });
      }

      setList((data || []).map((p: any) => ({
        ...p,
        track_count: coversByPlaylist[p.id]?.length,
        covers: coversByPlaylist[p.id] || [],
      })));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-5 pb-6">
      <header className="flex items-end justify-between">
        <div>
          <p className="eyebrow">Mi biblioteca</p>
          <h1 className="font-display text-2xl font-bold">Playlists</h1>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm" className="vapor-bg">
          <Plus className="h-4 w-4 mr-1" /> Nueva
        </Button>
      </header>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="aspect-square rounded-2xl bg-muted animate-pulse" />)}
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <ListMusic className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Aún no tienes playlists</p>
          <Button onClick={() => setCreateOpen(true)} className="vapor-bg">
            <Plus className="h-4 w-4 mr-1" /> Crear playlist
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {list.map((p) => (
            <button
              key={p.id}
              onClick={() => navigate(`/library/playlist/${p.id}`)}
              className="text-left group"
            >
              <div className="relative aspect-square rounded-2xl overflow-hidden border border-border vapor-bg">
                {p.covers && p.covers.length > 0 ? (
                  <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="bg-muted overflow-hidden">
                        {p.covers![i] ? <img src={p.covers![i]} alt="" className="w-full h-full object-cover" /> : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music2 className="h-10 w-10 text-white/70" />
                  </div>
                )}
                <div className="absolute top-2 right-2 chip chip-vapor !text-[9px] !px-2 !py-0.5 inline-flex items-center gap-1">
                  {p.is_public ? <Globe className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
                  {p.is_public ? 'Pública' : 'Privada'}
                </div>
              </div>
              <div className="mt-2 px-0.5">
                <div className="font-display font-bold text-sm truncate">{p.title}</div>
                <div className="text-xs text-muted-foreground">{p.track_count || 0} canciones</div>
              </div>
            </button>
          ))}
        </div>
      )}

      <CreatePlaylistDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(id) => navigate(`/library/playlist/${id}`)} />
    </div>
  );
}
