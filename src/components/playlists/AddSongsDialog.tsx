import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LibSong { id: string; title: string; artist: string; cover_url?: string }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  playlistId: string;
  existingSongIds: string[];
  onAdded?: () => void;
}

export default function AddSongsDialog({ open, onOpenChange, playlistId, existingSongIds, onAdded }: Props) {
  const [library, setLibrary] = useState<LibSong[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    (async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data, error } = await supabase
          .from('user_downloads')
          .select('songs!inner(id, title, cover_url, artists!inner(name), albums(cover_url))')
          .eq('user_id', user.id)
          .eq('hidden_from_library', false);
        if (error) throw error;
        const mapped: LibSong[] = (data || []).map((d: any) => ({
          id: d.songs.id,
          title: d.songs.title,
          artist: d.songs.artists.name,
          cover_url: d.songs.cover_url || d.songs.albums?.cover_url,
        }));
        setLibrary(mapped);
      } catch (e) {
        console.error(e);
      } finally { setLoading(false); }
    })();
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = library.filter((s) => !existingSongIds.includes(s.id));
    if (!q) return base;
    return base.filter((s) => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q));
  }, [library, existingSongIds, search]);

  const toggle = (id: string) => setSelected((p) => {
    const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const save = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('playlist_tracks').select('position').eq('playlist_id', playlistId)
        .order('position', { ascending: false }).limit(1);
      let pos = existing?.[0]?.position ?? -1;
      const rows = Array.from(selected).map((song_id) => ({ playlist_id: playlistId, song_id, position: ++pos }));
      const { error } = await supabase.from('playlist_tracks').insert(rows);
      if (error) throw error;
      toast.success(`${rows.length} canción${rows.length > 1 ? 'es' : ''} añadida${rows.length > 1 ? 's' : ''}`);
      onAdded?.();
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Error al añadir');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Añadir desde tu biblioteca</DialogTitle>
        </DialogHeader>
        <Input placeholder="Buscar canción o artista…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="flex-1 overflow-y-auto space-y-1 -mx-2 px-2">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Cargando…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {library.length === 0 ? 'Tu biblioteca está vacía. Descarga canciones primero.' : 'Todas las canciones de tu biblioteca ya están en esta playlist.'}
            </p>
          ) : filtered.map((s) => (
            <button key={s.id} type="button" onClick={() => toggle(s.id)} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 text-left">
              <Checkbox checked={selected.has(s.id)} onCheckedChange={() => toggle(s.id)} />
              <img src={s.cover_url || 'https://picsum.photos/64'} alt="" className="w-10 h-10 rounded object-cover" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm truncate">{s.title}</div>
                <div className="text-xs text-muted-foreground truncate">{s.artist}</div>
              </div>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving || selected.size === 0}>
            {saving ? 'Añadiendo…' : `Añadir ${selected.size || ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
