import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Upload, Music, AlertCircle, Play, Pause, Plus, Trash2, Users, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type CollabRole = 'featuring' | 'producer' | 'performer' | 'composer' | 'remix';

const COLLAB_ROLES: { value: CollabRole; label: string }[] = [
  { value: 'featuring', label: 'Featuring' },
  { value: 'producer', label: 'Productor' },
  { value: 'performer', label: 'Intérprete' },
  { value: 'composer', label: 'Compositor' },
  { value: 'remix', label: 'Remix' },
];

interface CollaboratorRow {
  id?: string; // existing DB id when editing
  artist_name: string;
  share_percent: number;
  is_primary: boolean;
  role: CollabRole;
}

/**
 * Construye el nombre artístico mostrado en catálogo a partir del artista
 * principal y los colaboradores con rol "featuring".
 *  - 1 feat:  "Diddyes ft Kanteo"
 *  - 2 feats: "Diddyes ft Kanteo & Tito Nsue"
 *  - 3+ feats: "Diddyes ft Kanteo, Tito Nsue & Otro"
 */
export const buildDisplayArtist = (
  primary: string,
  collaborators: { artist_name: string; is_primary: boolean; role: CollabRole }[],
): string => {
  const main = primary.trim();
  const feats = collaborators
    .filter(c => !c.is_primary && c.role === 'featuring' && c.artist_name.trim())
    .map(c => c.artist_name.trim());
  if (feats.length === 0) return main;
  if (feats.length === 1) return `${main} ft ${feats[0]}`;
  const last = feats[feats.length - 1];
  const head = feats.slice(0, -1).join(', ');
  return `${main} ft ${head} & ${last}`;
};

export interface EditingSubmission {
  id: string;
  title: string;
  artist_name: string;
  album_title: string | null;
  genre: string | null;
  release_date: string | null;
  track_url: string;
  track_path: string | null;
  preview_url: string | null;
  preview_path: string | null;
  cover_url: string | null;
  cover_path: string | null;
  duration_seconds: number;
  preview_start_seconds?: number | null;
}

interface SubmitSongDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultArtistName?: string;
  onSubmitted?: () => void;
  editing?: EditingSubmission | null;
}

interface FormState {
  title: string;
  artist_name: string;
  album_title: string;
  genre: string;
  release_date: string;
}

const PREVIEW_LENGTH = 20;

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const SubmitSongDialog = ({ open, onOpenChange, defaultArtistName = '', onSubmitted, editing = null }: SubmitSongDialogProps) => {
  const { user } = useAuthStore();
  const isEdit = !!editing;

  const [formData, setFormData] = useState<FormState>({
    title: '',
    artist_name: defaultArtistName,
    album_title: '',
    genre: '',
    release_date: '',
  });

  const [trackFile, setTrackFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Preview selection
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [previewStart, setPreviewStart] = useState<number>(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopTimerRef = useRef<number | null>(null);

  const trackInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Colaboraciones
  const [hasCollabs, setHasCollabs] = useState(false);
  const [collaborators, setCollaborators] = useState<CollaboratorRow[]>([]);

  const collabSum = collaborators.reduce((acc, c) => acc + (Number(c.share_percent) || 0), 0);
  const collabValid = !hasCollabs || (collaborators.length >= 2 && Math.abs(collabSum - 100) < 0.01 && collaborators.every(c => c.artist_name.trim().length > 0));

  // Inicializar/precargar campos al abrir
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setFormData({
        title: editing.title,
        artist_name: editing.artist_name,
        album_title: editing.album_title ?? '',
        genre: editing.genre ?? '',
        release_date: editing.release_date ?? '',
      });
      setAudioDuration(editing.duration_seconds || 0);
      setPreviewStart(editing.preview_start_seconds ?? 0);
      setAudioUrl(editing.track_url || null);
      // Cargar colaboradores existentes del envío
      (async () => {
        const { data } = await supabase
          .from('song_collaborators')
          .select('id,artist_name,share_percent,is_primary')
          .eq('submission_id', editing.id)
          .order('is_primary', { ascending: false });
        if (data && data.length > 0) {
          setHasCollabs(true);
          setCollaborators(data.map(d => ({
            id: d.id,
            artist_name: d.artist_name,
            share_percent: Number(d.share_percent),
            is_primary: !!d.is_primary,
          })));
        } else {
          setHasCollabs(false);
          setCollaborators([]);
        }
      })();
    } else {
      setFormData({
        title: '',
        artist_name: defaultArtistName,
        album_title: '',
        genre: '',
        release_date: '',
      });
      setAudioDuration(0);
      setPreviewStart(0);
      setAudioUrl(null);
      setHasCollabs(false);
      setCollaborators([]);
    }
    setTrackFile(null);
    setCoverFile(null);
    setProgress(0);
    stopPreview();
  }, [open, editing, defaultArtistName]);

  const enableCollabs = () => {
    setHasCollabs(true);
    if (collaborators.length === 0) {
      setCollaborators([
        { artist_name: formData.artist_name || defaultArtistName, share_percent: 50, is_primary: true },
        { artist_name: '', share_percent: 50, is_primary: false },
      ]);
    }
  };

  const disableCollabs = () => {
    setHasCollabs(false);
    setCollaborators([]);
  };

  const addCollaborator = () => {
    setCollaborators(prev => [...prev, { artist_name: '', share_percent: 0, is_primary: false }]);
  };

  const removeCollaborator = (idx: number) => {
    setCollaborators(prev => prev.filter((_, i) => i !== idx));
  };

  const updateCollab = (idx: number, patch: Partial<CollaboratorRow>) => {
    setCollaborators(prev => prev.map((c, i) => i === idx ? { ...c, ...patch } : c));
  };

  // Cleanup audio al cerrar
  useEffect(() => {
    if (!open) stopPreview();
    return () => stopPreview();
  }, [open]);

  const stopPreview = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (stopTimerRef.current) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    setIsPlayingPreview(false);
  };

  const playPreview = () => {
    if (!audioRef.current || !audioUrl) return;
    try {
      audioRef.current.currentTime = previewStart;
      audioRef.current.play();
      setIsPlayingPreview(true);
      const remaining = Math.min(PREVIEW_LENGTH, Math.max(0, audioDuration - previewStart));
      stopTimerRef.current = window.setTimeout(() => {
        stopPreview();
      }, remaining * 1000);
    } catch (e) {
      console.error('No se pudo reproducir el preview', e);
    }
  };

  const togglePreview = () => {
    if (isPlayingPreview) stopPreview();
    else playPreview();
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

  const handleFileSelect = async (type: 'track' | 'cover', file: File | null) => {
    if (!file) return;
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Archivo demasiado grande. Máximo 50MB.');
      return;
    }
    if (type === 'track') {
      const allowed = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/m4a', 'audio/x-m4a'];
      if (!allowed.includes(file.type)) {
        toast.error('Formato de audio no soportado. Usa MP3, WAV o M4A.');
        return;
      }
      setTrackFile(file);
      // Preparar URL local para selector de preview
      stopPreview();
      const localUrl = URL.createObjectURL(file);
      setAudioUrl(localUrl);
      try {
        const dur = await getAudioDuration(file);
        setAudioDuration(dur);
        setPreviewStart(0);
      } catch {
        setAudioDuration(0);
      }
    } else {
      const allowed = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowed.includes(file.type)) {
        toast.error('Formato de imagen no soportado. Usa JPG, PNG o WebP.');
        return;
      }
      setCoverFile(file);
    }
  };

  const validate = () => {
    if (!user) return toast.error('Debes iniciar sesión'), false;
    if (!formData.title.trim()) return toast.error('El título es requerido'), false;
    if (!formData.artist_name.trim()) return toast.error('El nombre del artista es requerido'), false;
    if (!isEdit && !trackFile) return toast.error('Debes subir el archivo de audio completo'), false;
    if (hasCollabs) {
      if (collaborators.length < 2) return toast.error('Una colaboración requiere al menos 2 artistas'), false;
      if (collaborators.some(c => !c.artist_name.trim())) return toast.error('Todos los colaboradores deben tener nombre artístico'), false;
      if (Math.abs(collabSum - 100) > 0.01) return toast.error(`La suma de splits debe ser 100% (actual: ${collabSum}%)`), false;
    }
    return true;
  };

  const persistCollaborators = async (submissionId: string) => {
    // Borrar todos y reinsertar (más simple y consistente)
    await supabase.from('song_collaborators').delete().eq('submission_id', submissionId);
    if (!hasCollabs || collaborators.length === 0) return;
    const rows = collaborators.map(c => ({
      submission_id: submissionId,
      artist_name: c.artist_name.trim(),
      share_percent: c.share_percent,
      is_primary: c.is_primary,
    }));
    const { error } = await supabase.from('song_collaborators').insert(rows);
    if (error) throw error;
  };

  const handleSubmit = async () => {
    if (!validate() || !user) return;
    stopPreview();
    setUploading(true);
    setProgress(0);
    try {
      const ts = Date.now();
      const safe = formData.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const folder = user.id;

      let duration = editing?.duration_seconds ?? audioDuration ?? 0;
      let trackUp: { path: string; url: string } | null = null;
      let cover: { path: string; url: string } | null = null;

      if (trackFile) {
        duration = await getAudioDuration(trackFile);
        setProgress(20);
        trackUp = await uploadFile(trackFile, `${folder}/${ts}_${safe}_full.${trackFile.name.split('.').pop()}`);
        setProgress(70);
      }

      if (coverFile) {
        cover = await uploadFile(coverFile, `${folder}/${ts}_${safe}_cover.${coverFile.name.split('.').pop()}`);
        setProgress(90);
      }

      // Asegurar que previewStart no exceda la duración
      const safePreviewStart = Math.max(0, Math.min(previewStart, Math.max(0, duration - PREVIEW_LENGTH)));

      if (isEdit && editing) {
        const update: Record<string, any> = {
          title: formData.title.trim(),
          artist_name: formData.artist_name.trim(),
          album_title: formData.album_title.trim() || null,
          genre: formData.genre.trim() || null,
          release_date: formData.release_date || null,
          duration_seconds: duration,
          preview_start_seconds: safePreviewStart,
          status: 'pending',
          rejection_reason: null,
          reviewed_at: null,
          reviewed_by: null,
        };
        if (trackUp) {
          update.track_url = trackUp.url;
          update.track_path = trackUp.path;
        }
        if (cover) {
          update.cover_url = cover.url;
          update.cover_path = cover.path;
        }
        const { error: dbError } = await supabase
          .from('song_submissions')
          .update(update)
          .eq('id', editing.id);
        if (dbError) throw dbError;
        await persistCollaborators(editing.id);
        setProgress(100);
        toast.success('Envío actualizado y reenviado a revisión');
      } else {
        if (!trackUp) throw new Error('Falta archivo de audio');
        const { data: inserted, error: dbError } = await supabase.from('song_submissions').insert({
          user_id: user.id,
          title: formData.title.trim(),
          artist_name: formData.artist_name.trim(),
          album_title: formData.album_title.trim() || null,
          genre: formData.genre.trim() || null,
          release_date: formData.release_date || null,
          duration_seconds: duration,
          preview_start_seconds: safePreviewStart,
          track_url: trackUp.url,
          track_path: trackUp.path,
          cover_url: cover?.url ?? null,
          cover_path: cover?.path ?? null,
        }).select('id').single();
        if (dbError) throw dbError;
        if (inserted?.id) await persistCollaborators(inserted.id);
        setProgress(100);
        toast.success('Canción enviada a revisión');
      }

      onOpenChange(false);
      onSubmitted?.();
    } catch (err: any) {
      console.error('Error al enviar canción', err);
      toast.error('Error al enviar: ' + (err.message ?? 'desconocido'));
    } finally {
      setUploading(false);
    }
  };

  const maxStart = Math.max(0, audioDuration - PREVIEW_LENGTH);
  const previewEnd = Math.min(audioDuration, previewStart + PREVIEW_LENGTH);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!uploading) onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            {isEdit ? 'Editar y reenviar canción' : 'Enviar canción a revisión'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Corrige los datos y/o archivos. Al guardar volverá al estado "en revisión".'
              : 'Tu canción será revisada por la administración antes de publicarse en el catálogo.'}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="genre">Género musical</Label>
              <Input
                id="genre"
                value={formData.genre}
                onChange={(e) => setFormData((p) => ({ ...p, genre: e.target.value }))}
                placeholder="Pop, Rock, Reggaetón…"
                maxLength={60}
              />
            </div>
            <div>
              <Label htmlFor="release_date">Fecha de lanzamiento</Label>
              <Input
                id="release_date"
                type="date"
                value={formData.release_date}
                onChange={(e) => setFormData((p) => ({ ...p, release_date: e.target.value }))}
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
            {isEdit && (
              <p className="text-xs text-muted-foreground">
                Solo necesitas volver a subir los archivos que quieras reemplazar.
              </p>
            )}

            <div>
              <Label>Audio completo {!isEdit && '*'}</Label>
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
                {trackFile
                  ? `Seleccionado: ${trackFile.name}`
                  : isEdit
                    ? 'Reemplazar audio (opcional)'
                    : 'Seleccionar audio (MP3/WAV/M4A)'}
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

          {/* Colaboraciones y splits */}
          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" /> ¿Es una colaboración?
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Define los splits de monetización entre los artistas. Si un colaborador no
                  está aún en Yusiop, su parte se reservará en el pozo común hasta que se registre.
                </p>
              </div>
              {!hasCollabs ? (
                <Button type="button" size="sm" variant="outline" onClick={enableCollabs}>
                  <Plus className="h-4 w-4 mr-1" /> Añadir colaboración
                </Button>
              ) : (
                <Button type="button" size="sm" variant="ghost" onClick={disableCollabs}>
                  Quitar
                </Button>
              )}
            </div>

            {hasCollabs && (
              <div className="space-y-2">
                {collaborators.map((c, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <Input
                      className="col-span-7"
                      placeholder="Nombre artístico"
                      value={c.artist_name}
                      onChange={(e) => updateCollab(i, { artist_name: e.target.value })}
                      maxLength={80}
                    />
                    <div className="col-span-3 flex items-center gap-1">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={c.share_percent}
                        onChange={(e) => updateCollab(i, { share_percent: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                    <div className="col-span-2 flex justify-end items-center gap-1">
                      {c.is_primary ? (
                        <span className="text-[10px] uppercase tracking-wider text-primary font-semibold">Principal</span>
                      ) : (
                        <Button type="button" size="icon" variant="ghost" onClick={() => removeCollaborator(i)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between pt-2">
                  <Button type="button" size="sm" variant="outline" onClick={addCollaborator}>
                    <Plus className="h-4 w-4 mr-1" /> Añadir artista
                  </Button>
                  <span className={`text-sm font-semibold ${Math.abs(collabSum - 100) < 0.01 ? 'text-primary' : 'text-destructive'}`}>
                    Total: {collabSum}% {Math.abs(collabSum - 100) < 0.01 ? '✓' : '(debe ser 100%)'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {audioUrl && audioDuration > 0 && (
            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold">Fragmento de previsualización</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Elige el momento donde empezarán los <strong>20 segundos</strong> que sonarán en el catálogo.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={isPlayingPreview ? 'secondary' : 'default'}
                  onClick={togglePreview}
                  disabled={maxStart < 0}
                >
                  {isPlayingPreview ? (
                    <><Pause className="h-4 w-4 mr-1" /> Detener</>
                  ) : (
                    <><Play className="h-4 w-4 mr-1" /> Escuchar</>
                  )}
                </Button>
              </div>

              <audio
                ref={audioRef}
                src={audioUrl}
                onEnded={stopPreview}
                preload="metadata"
                className="hidden"
              />

              {audioDuration <= PREVIEW_LENGTH ? (
                <p className="text-xs text-muted-foreground">
                  La canción dura menos de {PREVIEW_LENGTH}s, se reproducirá entera como preview.
                </p>
              ) : (
                <>
                  <Slider
                    value={[previewStart]}
                    min={0}
                    max={maxStart}
                    step={1}
                    onValueChange={(v) => {
                      stopPreview();
                      setPreviewStart(v[0]);
                    }}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Inicio: <strong className="text-foreground">{formatTime(previewStart)}</strong></span>
                    <span>Fin: <strong className="text-foreground">{formatTime(previewEnd)}</strong></span>
                    <span>Duración total: {formatTime(audioDuration)}</span>
                  </div>
                </>
              )}
            </div>
          )}

          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{isEdit ? 'Guardando…' : 'Enviando…'}</span>
              </div>
              <Progress value={progress} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={uploading || !formData.title || !formData.artist_name || (!isEdit && !trackFile) || !collabValid}
          >
            {uploading ? 'Guardando…' : isEdit ? 'Guardar y reenviar' : 'Enviar a revisión'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SubmitSongDialog;
