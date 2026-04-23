import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Upload, Music, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

interface SubmitSongDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultArtistName?: string;
  onSubmitted?: () => void;
}

interface FormState {
  title: string;
  artist_name: string;
  album_title: string;
}

const SubmitSongDialog = ({ open, onOpenChange, defaultArtistName = '', onSubmitted }: SubmitSongDialogProps) => {
  const { user } = useAuthStore();
  const [formData, setFormData] = useState<FormState>({
    title: '',
    artist_name: defaultArtistName,
    album_title: '',
  });

  const [trackFile, setTrackFile] = useState<File | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const trackInputRef = useRef<HTMLInputElement>(null);
  const previewInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFormData({ title: '', artist_name: defaultArtistName, album_title: '' });
    setTrackFile(null);
    setPreviewFile(null);
    setCoverFile(null);
    setProgress(0);
  };

  const getAudioDuration = (file: File): Promise<number> =>
    new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.onloadedmetadata = () => resolve(Math.floor(audio.duration));
      audio.onerror = () => reject(new Error('No se pudo obtener la duración del audio'));
      audio.src = URL.createObjectURL(file);
    });

  const uploadFile = async (file: File, path: string): Promise<{ path: string; url: string }> => {
    const { data, error } = await supabase.storage
      .from('artist-submissions')
      .upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) throw error;
    const { data: signed } = await supabase.storage
      .from('artist-submissions')
      .createSignedUrl(data.path, 60 * 60 * 24 * 365);
    return { path: data.path, url: signed?.signedUrl ?? '' };
  };

  const handleFileSelect = (type: 'track' | 'preview' | 'cover', file: File | null) => {
    if (!file) return;
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Archivo demasiado grande. Máximo 50MB.');
      return;
    }
    if (type === 'track' || type === 'preview') {
      const allowed = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/m4a', 'audio/x-m4a'];
      if (!allowed.includes(file.type)) {
        toast.error('Formato de audio no soportado. Usa MP3, WAV o M4A.');
        return;
      }
    } else {
      const allowed = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowed.includes(file.type)) {
        toast.error('Formato de imagen no soportado. Usa JPG, PNG o WebP.');
        return;
      }
    }
    if (type === 'track') setTrackFile(file);
    if (type === 'preview') setPreviewFile(file);
    if (type === 'cover') setCoverFile(file);
  };

  const validate = () => {
    if (!user) return toast.error('Debes iniciar sesión'), false;
    if (!formData.title.trim()) return toast.error('El título es requerido'), false;
    if (!formData.artist_name.trim()) return toast.error('El nombre del artista es requerido'), false;
    if (!trackFile) return toast.error('Debes subir el archivo de audio completo'), false;
    return true;
  };

  const handleSubmit = async () => {
    if (!validate() || !user || !trackFile) return;
    setUploading(true);
    setProgress(0);
    try {
      const duration = await getAudioDuration(trackFile);
      setProgress(10);

      const ts = Date.now();
      const safe = formData.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const folder = user.id;

      const trackUp = await uploadFile(trackFile, `${folder}/${ts}_${safe}_full.${trackFile.name.split('.').pop()}`);
      setProgress(50);

      let preview: { path: string; url: string } | null = null;
      if (previewFile) {
        preview = await uploadFile(previewFile, `${folder}/${ts}_${safe}_preview.${previewFile.name.split('.').pop()}`);
        setProgress(70);
      }

      let cover: { path: string; url: string } | null = null;
      if (coverFile) {
        cover = await uploadFile(coverFile, `${folder}/${ts}_${safe}_cover.${coverFile.name.split('.').pop()}`);
        setProgress(85);
      }

      const { error: dbError } = await supabase.from('song_submissions').insert({
        user_id: user.id,
        title: formData.title.trim(),
        artist_name: formData.artist_name.trim(),
        album_title: formData.album_title.trim() || null,
        duration_seconds: duration,
        track_url: trackUp.url,
        track_path: trackUp.path,
        preview_url: preview?.url ?? null,
        preview_path: preview?.path ?? null,
        cover_url: cover?.url ?? null,
        cover_path: cover?.path ?? null,
      });
      if (dbError) throw dbError;

      setProgress(100);
      toast.success('Canción enviada a revisión');
      reset();
      onOpenChange(false);
      onSubmitted?.();
    } catch (err: any) {
      console.error('Error al enviar canción', err);
      toast.error('Error al enviar: ' + (err.message ?? 'desconocido'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!uploading) onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Enviar canción a revisión
          </DialogTitle>
          <DialogDescription>
            Tu canción será revisada por la administración antes de publicarse en el catálogo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                placeholder="Nombre de la canción"
                maxLength={120}
              />
            </div>
            <div>
              <Label htmlFor="artist">Nombre artístico *</Label>
              <Input
                id="artist"
                value={formData.artist_name}
                onChange={(e) => setFormData((p) => ({ ...p, artist_name: e.target.value }))}
                placeholder="Tu nombre artístico"
                maxLength={80}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="album">Álbum (opcional)</Label>
            <Input
              id="album"
              value={formData.album_title}
              onChange={(e) => setFormData((p) => ({ ...p, album_title: e.target.value }))}
              placeholder="Título del álbum si pertenece a uno"
              maxLength={120}
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Archivos</h3>

            <div>
              <Label>Audio completo *</Label>
              <input
                ref={trackInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => handleFileSelect('track', e.target.files?.[0] || null)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => trackInputRef.current?.click()}
                className="w-full mt-2"
              >
                <Upload className="h-4 w-4 mr-2" />
                {trackFile ? `Seleccionado: ${trackFile.name}` : 'Seleccionar audio (MP3/WAV/M4A)'}
              </Button>
            </div>

            <div>
              <Label>Preview (opcional)</Label>
              <input
                ref={previewInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => handleFileSelect('preview', e.target.files?.[0] || null)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => previewInputRef.current?.click()}
                className="w-full mt-2"
              >
                <Upload className="h-4 w-4 mr-2" />
                {previewFile ? `Seleccionado: ${previewFile.name}` : 'Seleccionar preview'}
              </Button>
            </div>

            <div>
              <Label>Portada (opcional)</Label>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileSelect('cover', e.target.files?.[0] || null)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => coverInputRef.current?.click()}
                className="w-full mt-2"
              >
                <Upload className="h-4 w-4 mr-2" />
                {coverFile ? `Seleccionado: ${coverFile.name}` : 'Seleccionar imagen (JPG/PNG/WebP)'}
              </Button>
            </div>
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Enviando…</span>
              </div>
              <Progress value={progress} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={uploading || !formData.title || !formData.artist_name || !trackFile}>
            {uploading ? 'Enviando…' : 'Enviar a revisión'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SubmitSongDialog;
