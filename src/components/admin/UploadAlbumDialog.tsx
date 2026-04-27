import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Upload, ImageIcon, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { validateCoverDimensions, MIN_COVER_DIMENSION } from '@/lib/imageValidation';

interface Artist {
  id: string;
  name: string;
}

interface UploadAlbumDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAlbumUploaded: () => void;
  artists: Artist[];
}

interface AlbumFormData {
  title: string;
  artist_name: string;
  release_date: string;
  cover_url: string;
}

const UploadAlbumDialog = ({ open, onOpenChange, onAlbumUploaded, artists }: UploadAlbumDialogProps) => {
  const [formData, setFormData] = useState<AlbumFormData>({
    title: '',
    artist_name: '',
    release_date: '',
    cover_url: ''
  });
  
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setFormData({
      title: '',
      artist_name: '',
      release_date: '',
      cover_url: ''
    });
    setCoverFile(null);
    setUploadProgress(0);
  };

  const handleClose = () => {
    if (!uploading) {
      resetForm();
      onOpenChange(false);
    }
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      toast.error('El título del álbum es requerido');
      return false;
    }
    if (!formData.artist_name.trim()) {
      toast.error('El nombre del artista es requerido');
      return false;
    }
    return true;
  };

  const handleCoverSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor selecciona un archivo de imagen válido');
        return;
      }

      // Validar tamaño (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('La imagen no puede superar los 5MB');
        return;
      }

      // Validar dimensiones mínimas
      try {
        await validateCoverDimensions(file);
      } catch (err: any) {
        toast.error(err?.message || 'La portada no cumple los requisitos.');
        return;
      }

      setCoverFile(file);

      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData(prev => ({ ...prev, cover_url: e.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadCoverToStorage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `album-cover-${Date.now()}.${fileExt}`;
    const filePath = `covers/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('songs')
      .upload(filePath, file);

    if (uploadError) {
      throw new Error(`Error uploading cover: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('songs')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      setUploadProgress(20);

      let coverUrl = null;
      
      // Subir portada si se seleccionó
      if (coverFile) {
        setUploadProgress(40);
        coverUrl = await uploadCoverToStorage(coverFile);
        setUploadProgress(60);
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

      setUploadProgress(80);

      // Crear álbum en la base de datos
      const { error: dbError } = await supabase
        .from('albums')
        .insert({
          title: formData.title.trim(),
          artist_id: artistId,
          cover_url: coverUrl,
          release_date: formData.release_date || null
        });

      if (dbError) {
        throw new Error(`Error creating album: ${dbError.message}`);
      }

      setUploadProgress(100);
      
      toast.success('Álbum creado exitosamente');
      resetForm();
      onAlbumUploaded();
      onOpenChange(false);
      
    } catch (error) {
      console.error('Error uploading album:', error);
      toast.error(error instanceof Error ? error.message : 'Error al crear el álbum');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Subir Nuevo Álbum</DialogTitle>
          <DialogDescription>
            Completa la información del álbum para agregarlo a la plataforma
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Cover Upload */}
          <div className="space-y-2">
            <Label>Portada del Álbum</Label>
            <div className="flex flex-col space-y-4">
              {formData.cover_url && (
                <div className="aspect-square w-32 mx-auto">
                  <img
                    src={formData.cover_url}
                    alt="Album cover preview"
                    className="w-full h-full object-cover rounded-lg border"
                  />
                </div>
              )}
              
              <Button
                variant="outline"
                onClick={() => coverInputRef.current?.click()}
                disabled={uploading}
                className="w-full"
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                {coverFile ? 'Cambiar Portada' : 'Seleccionar Portada'}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Cuadrada · JPG, PNG o WebP
              </p>
              
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverSelect}
                className="hidden"
              />
              
              <p className="text-xs text-muted-foreground text-center">
                Formatos soportados: JPG, PNG, WebP (máx. 5MB)
              </p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="title">Título del Álbum *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Nombre del álbum"
                disabled={uploading}
              />
            </div>
            
            <div>
              <Label htmlFor="artist">Artista *</Label>
              <Input
                id="artist"
                value={formData.artist_name}
                onChange={(e) => setFormData(prev => ({ ...prev, artist_name: e.target.value }))}
                placeholder="Nombre del artista"
                disabled={uploading}
              />
            </div>

            <div>
              <Label htmlFor="release_date">Fecha de Lanzamiento</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="release_date"
                  type="date"
                  value={formData.release_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, release_date: e.target.value }))}
                  disabled={uploading}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Creando álbum...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={uploading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={uploading || !formData.title.trim() || !formData.artist_name.trim()}
          >
            {uploading ? 'Creando...' : 'Crear Álbum'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UploadAlbumDialog;