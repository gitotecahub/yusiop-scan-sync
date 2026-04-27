import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Upload, Music, AlertCircle, Users, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Artist {
  id: string;
  name: string;
}

interface Album {
  id: string;
  title: string;
  cover_url?: string;
}

interface UploadSongDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSongUploaded: () => void;
  artists: Artist[];
  albums: Album[];
}

interface SongFormData {
  title: string;
  artist_name: string;
  album_id: string;
  duration_seconds: number;
  cover_url: string;
}

type CollabRole = 'featuring' | 'producer' | 'performer' | 'composer' | 'remix';

const COLLAB_ROLES: { value: CollabRole; label: string }[] = [
  { value: 'featuring', label: 'Featuring' },
  { value: 'producer', label: 'Productor' },
  { value: 'performer', label: 'Intérprete' },
  { value: 'composer', label: 'Compositor' },
  { value: 'remix', label: 'Remix' },
];

interface CollaboratorRow {
  artist_name: string;
  share_percent: number;
  is_primary: boolean;
  role: CollabRole;
  contact_email: string;
}

const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const UploadSongDialog = ({ open, onOpenChange, onSongUploaded, artists, albums }: UploadSongDialogProps) => {
  const [formData, setFormData] = useState<SongFormData>({
    title: '',
    artist_name: '',
    album_id: '',
    duration_seconds: 0,
    cover_url: ''
  });
  
  const [trackFile, setTrackFile] = useState<File | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Colaboraciones
  const [hasCollabs, setHasCollabs] = useState(false);
  const [collaborators, setCollaborators] = useState<CollaboratorRow[]>([]);
  
  const trackInputRef = useRef<HTMLInputElement>(null);
  const previewInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const collabSum = collaborators.reduce((acc, c) => acc + (Number(c.share_percent) || 0), 0);

  const resetForm = () => {
    setFormData({
      title: '',
      artist_name: '',
      album_id: '',
      duration_seconds: 0,
      cover_url: ''
    });
    setTrackFile(null);
    setPreviewFile(null);
    setCoverFile(null);
    setUploadProgress(0);
    setHasCollabs(false);
    setCollaborators([]);
  };

  const enableCollabs = () => {
    setHasCollabs(true);
    if (collaborators.length === 0) {
      setCollaborators([
        { artist_name: formData.artist_name, share_percent: 50, is_primary: true, role: 'featuring', contact_email: '' },
        { artist_name: '', share_percent: 50, is_primary: false, role: 'featuring', contact_email: '' },
      ]);
    }
  };

  const disableCollabs = () => {
    setHasCollabs(false);
    setCollaborators([]);
  };

  const addCollaborator = () => {
    setCollaborators(prev => [...prev, { artist_name: '', share_percent: 0, is_primary: false, role: 'featuring', contact_email: '' }]);
  };

  const removeCollaborator = (idx: number) => {
    setCollaborators(prev => prev.filter((_, i) => i !== idx));
  };

  const updateCollab = (idx: number, patch: Partial<CollaboratorRow>) => {
    setCollaborators(prev => prev.map((c, i) => i === idx ? { ...c, ...patch } : c));
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      toast.error('El título es requerido');
      return false;
    }
    if (!formData.artist_name.trim()) {
      toast.error('El nombre del artista es requerido');
      return false;
    }
    if (!trackFile) {
      toast.error('Debes subir el archivo de audio completo');
      return false;
    }
    if (hasCollabs) {
      if (collaborators.length < 2) {
        toast.error('Una colaboración requiere al menos 2 artistas');
        return false;
      }
      if (collaborators.some(c => !c.artist_name.trim())) {
        toast.error('Todos los colaboradores deben tener nombre artístico');
        return false;
      }
      const badEmail = collaborators.find(c => c.contact_email.trim() && !emailRe.test(c.contact_email.trim()));
      if (badEmail) {
        toast.error(`Email inválido: ${badEmail.contact_email}`);
        return false;
      }
      if (Math.abs(collabSum - 100) > 0.01) {
        toast.error(`La suma de splits debe ser 100% (actual: ${collabSum}%)`);
        return false;
      }
    }
    return true;
  };

  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.onloadedmetadata = () => {
        resolve(Math.floor(audio.duration));
      };
      audio.onerror = () => {
        reject(new Error('No se pudo obtener la duración del audio'));
      };
      audio.src = URL.createObjectURL(file);
    });
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const { data, error } = await supabase.storage
      .from('songs')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('songs')
      .getPublicUrl(data.path);

    return publicUrl;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setUploading(true);
    setUploadProgress(0);
    
    try {
      // Obtener duración del archivo principal
      const duration = await getAudioDuration(trackFile!);
      setUploadProgress(10);

      // Generar nombres únicos para los archivos
      const timestamp = Date.now();
      const sanitizedTitle = formData.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      
      // Subir archivo principal
      const trackPath = `tracks/${timestamp}_${sanitizedTitle}_full.${trackFile!.name.split('.').pop()}`;
      const trackUrl = await uploadFile(trackFile!, trackPath);
      setUploadProgress(40);

      // Subir preview si existe
      let previewUrl = null;
      if (previewFile) {
        const previewPath = `previews/${timestamp}_${sanitizedTitle}_preview.${previewFile.name.split('.').pop()}`;
        previewUrl = await uploadFile(previewFile, previewPath);
        setUploadProgress(60);
      }

      // Subir cover si existe
      let coverUrl = formData.cover_url;
      if (coverFile) {
        const coverPath = `covers/${timestamp}_${sanitizedTitle}_cover.${coverFile.name.split('.').pop()}`;
        coverUrl = await uploadFile(coverFile, coverPath);
        setUploadProgress(80);
      }

      // Buscar o crear artista
      let artistId = null;
      const { data: existingArtist } = await supabase
        .from('artists')
        .select('id')
        .eq('name', formData.artist_name.trim())
        .single();

      if (existingArtist) {
        artistId = existingArtist.id;
      } else {
        const { data: newArtist, error: artistError } = await supabase
          .from('artists')
          .insert({ name: formData.artist_name.trim() })
          .select('id')
          .single();
        
        if (artistError) throw artistError;
        artistId = newArtist.id;
      }

      // Crear registro en la base de datos
      const { data: insertedSong, error: dbError } = await supabase
        .from('songs')
        .insert({
          title: formData.title,
          artist_id: artistId,
          album_id: formData.album_id || null,
          duration_seconds: duration,
          track_url: trackUrl,
          preview_url: previewUrl,
          cover_url: coverUrl
        })
        .select('id')
        .single();

      if (dbError) throw dbError;

      // Insertar colaboradores si los hay
      if (hasCollabs && collaborators.length > 0 && insertedSong?.id) {
        const rows = collaborators.map(c => ({
          song_id: insertedSong.id,
          artist_name: c.artist_name.trim(),
          share_percent: Number(c.share_percent) || 0,
          is_primary: c.is_primary,
          role: c.role,
          contact_email: c.contact_email.trim() || null,
        }));
        const { error: collabError } = await supabase
          .from('song_collaborators')
          .insert(rows);
        if (collabError) {
          console.error('Error guardando colaboradores:', collabError);
          toast.error('Canción creada, pero falló al guardar colaboradores: ' + collabError.message);
        }
      }

      setUploadProgress(100);
      toast.success('Canción subida exitosamente');
      resetForm();
      onSongUploaded();
      onOpenChange(false);
      
    } catch (error: any) {
      console.error('Error uploading song:', error);
      toast.error('Error al subir la canción: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (type: 'track' | 'preview' | 'cover', file: File | null) => {
    if (!file) return;

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      toast.error('El archivo es demasiado grande. Máximo 50MB.');
      return;
    }

    if (type === 'track' || type === 'preview') {
      const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/m4a'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Formato de audio no soportado. Use MP3, WAV o M4A.');
        return;
      }
    } else if (type === 'cover') {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Formato de imagen no soportado. Use JPG, PNG o WebP.');
        return;
      }
    }

    switch (type) {
      case 'track':
        setTrackFile(file);
        break;
      case 'preview':
        setPreviewFile(file);
        break;
      case 'cover':
        setCoverFile(file);
        break;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Subir Nueva Canción
          </DialogTitle>
          <DialogDescription>
            Complete la información de la canción y suba los archivos necesarios
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Información básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Título de la canción *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Nombre de la canción"
              />
            </div>
            
            <div>
              <Label htmlFor="artist">Artista *</Label>
              <Input
                id="artist"
                value={formData.artist_name}
                onChange={(e) => setFormData(prev => ({ ...prev, artist_name: e.target.value }))}
                placeholder="Nombre del artista"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="album">Álbum (opcional)</Label>
              <Select 
                value={formData.album_id} 
                onValueChange={(value) => {
                  const selectedAlbum = albums.find(album => album.id === value);
                  setFormData(prev => ({ 
                    ...prev, 
                    album_id: value,
                    cover_url: selectedAlbum?.cover_url || prev.cover_url
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar álbum" />
                </SelectTrigger>
                <SelectContent>
                  {albums.map((album) => (
                    <SelectItem key={album.id} value={album.id}>
                      {album.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="cover_url">URL de portada (opcional)</Label>
              <Input
                id="cover_url"
                value={formData.cover_url}
                onChange={(e) => setFormData(prev => ({ ...prev, cover_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Archivos */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Archivos</h3>
            
            {/* Archivo principal */}
            <div>
              <Label>Archivo de audio completo *</Label>
              <div className="mt-2">
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
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {trackFile ? `Seleccionado: ${trackFile.name}` : 'Seleccionar archivo de audio'}
                </Button>
              </div>
            </div>

            {/* Preview */}
            <div>
              <Label>Archivo de preview (opcional)</Label>
              <div className="mt-2">
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
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {previewFile ? `Seleccionado: ${previewFile.name}` : 'Seleccionar preview'}
                </Button>
              </div>
            </div>

            {/* Cover */}
            <div>
              <Label>Imagen de portada (opcional)</Label>
              <div className="mt-2">
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
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {coverFile ? `Seleccionado: ${coverFile.name}` : 'Seleccionar imagen'}
                </Button>
              </div>
            </div>
          </div>

          {/* Colaboraciones / Reparto */}
          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-semibold">Colaboraciones / Reparto</h3>
                  <p className="text-xs text-muted-foreground">
                    Define los splits de royalties entre los artistas participantes
                  </p>
                </div>
              </div>
              <Switch
                checked={hasCollabs}
                onCheckedChange={(v) => (v ? enableCollabs() : disableCollabs())}
              />
            </div>

            {hasCollabs && (
              <div className="space-y-3 pt-2">
                {collaborators.map((c, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end border rounded-md p-3">
                    <div className="col-span-12 md:col-span-4">
                      <Label className="text-xs">Nombre artístico *</Label>
                      <Input
                        value={c.artist_name}
                        onChange={(e) => updateCollab(idx, { artist_name: e.target.value })}
                        placeholder="Nombre artístico"
                      />
                    </div>
                    <div className="col-span-6 md:col-span-3">
                      <Label className="text-xs">Rol</Label>
                      <Select
                        value={c.role}
                        onValueChange={(v) => updateCollab(idx, { role: v as CollabRole })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COLLAB_ROLES.map(r => (
                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3 md:col-span-2">
                      <Label className="text-xs">Split %</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={c.share_percent}
                        onChange={(e) => updateCollab(idx, { share_percent: Number(e.target.value) })}
                      />
                    </div>
                    <div className="col-span-3 md:col-span-2 flex items-center gap-2 pb-2">
                      <Switch
                        checked={c.is_primary}
                        onCheckedChange={(v) => {
                          // Solo uno puede ser primary
                          setCollaborators(prev => prev.map((row, i) => ({
                            ...row,
                            is_primary: i === idx ? v : (v ? false : row.is_primary),
                          })));
                        }}
                      />
                      <Label className="text-xs">Principal</Label>
                    </div>
                    <div className="col-span-12 md:col-span-11">
                      <Label className="text-xs">Email de contacto (para invitación / reclamación)</Label>
                      <Input
                        type="email"
                        value={c.contact_email}
                        onChange={(e) => updateCollab(idx, { contact_email: e.target.value })}
                        placeholder="email@ejemplo.com"
                      />
                    </div>
                    <div className="col-span-12 md:col-span-1 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCollaborator(idx)}
                        disabled={collaborators.length <= 2}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between">
                  <Button type="button" variant="outline" size="sm" onClick={addCollaborator}>
                    <Plus className="h-4 w-4 mr-1" />
                    Añadir colaborador
                  </Button>
                  <span className={`text-sm font-medium ${Math.abs(collabSum - 100) < 0.01 ? 'text-green-600' : 'text-destructive'}`}>
                    Suma: {collabSum}% {Math.abs(collabSum - 100) < 0.01 ? '✓' : '(debe ser 100%)'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Subiendo canción...</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={uploading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={uploading || !formData.title || !formData.artist_name.trim() || !trackFile}
          >
            {uploading ? 'Subiendo...' : 'Subir Canción'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UploadSongDialog;
