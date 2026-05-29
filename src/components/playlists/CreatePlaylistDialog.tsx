import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (id: string) => void;
  initial?: { id: string; title: string; description?: string | null; is_public: boolean };
}

export default function CreatePlaylistDialog({ open, onOpenChange, onCreated, initial }: Props) {
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [isPublic, setIsPublic] = useState(initial?.is_public || false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) {
      toast.error('El título es obligatorio');
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Debes iniciar sesión');
        return;
      }
      if (initial?.id) {
        const { error } = await supabase
          .from('playlists')
          .update({ title: title.trim(), description: description.trim() || null, is_public: isPublic })
          .eq('id', initial.id);
        if (error) throw error;
        toast.success('Playlist actualizada');
        onCreated?.(initial.id);
      } else {
        const { data, error } = await supabase
          .from('playlists')
          .insert({ user_id: user.id, title: title.trim(), description: description.trim() || null, is_public: isPublic })
          .select('id')
          .single();
        if (error) throw error;
        toast.success('Playlist creada');
        onCreated?.(data.id);
      }
      onOpenChange(false);
      setTitle(''); setDescription(''); setIsPublic(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? 'Editar playlist' : 'Nueva playlist'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Título</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Mi playlist favorita" />
          </div>
          <div>
            <Label htmlFor="desc">Descripción (opcional)</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} rows={3} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <div className="text-sm font-semibold">Pública</div>
              <div className="text-xs text-muted-foreground">Cualquiera con el enlace podrá verla</div>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Guardando…' : initial ? 'Guardar' : 'Crear'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
