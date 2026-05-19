import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, Music, Plus, Trash2, ArrowUp, ArrowDown, Disc3, Image as ImageIcon, ShieldAlert, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { validateCoverDimensions } from '@/lib/imageValidation';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultArtistName?: string;
  onSubmitted?: () => void;
}

interface AlbumInfo {
  title: string;
  artist_name: string;
  genre: string;
  release_date: string;
  description: string;
}

interface TrackDraft {
  id: string; // local id
  title: string;
  file: File | null;
  duration: number;
  is_explicit: boolean;
}

const MAX_AUDIO_MB = 50;
const MAX_TRACKS = 30;

const getAudioDuration = (file: File): Promise<number> =>
  new Promise((resolve) => {
    const audio = new Audio();
    audio.onloadedmetadata = () => resolve(Math.floor(audio.duration));
    audio.onerror = () => resolve(0);
    audio.src = URL.createObjectURL(file);
  });

const SubmitAlbumDialog = ({ open, onOpenChange, defaultArtistName = '', onSubmitted }: Props) => {
  const { user } = useAuthStore();
  const [step, setStep] = useState(1);
  const [info, setInfo] = useState<AlbumInfo>({
    title: '',
    artist_name: defaultArtistName,
    genre: '',
    release_date: '',
    description: '',
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [tracks, setTracks] = useState<TrackDraft[]>([]);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const tracksInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setInfo({ title: '', artist_name: defaultArtistName, genre: '', release_date: '', description: '' });
    setCoverFile(null);
    setCoverPreview(null);
    setTracks([]);
    setRightsConfirmed(false);
    setSubmitting(false);
    setProgress(0);
  }, [open, defaultArtistName]);

  const handleCover = async (f: File | null) => {
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
      toast.error('Formato no soportado. Usa JPG, PNG o WebP.');
      return;
    }
    try {
      await validateCoverDimensions(f);
    } catch (e: any) {
      toast.error(e?.message ?? 'La portada no cumple los requisitos.');
      return;
    }
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
  };

  const handleTracksAdd = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = MAX_TRACKS - tracks.length;
    if (remaining <= 0) {
      toast.error(`Máximo ${MAX_TRACKS} pistas por álbum.`);
      return;
    }
    const arr = Array.from(files).slice(0, remaining);
    const newDrafts: TrackDraft[] = [];
    for (const f of arr) {
      if (f.size > MAX_AUDIO_MB * 1024 * 1024) {
        toast.error(`${f.name}: supera ${MAX_AUDIO_MB}MB`);
        continue;
      }
      const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
      const allowedMime = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav'];
      if (!allowedMime.includes(f.type) && !['mp3', 'wav'].includes(ext)) {
        toast.error(`${f.name}: formato no soportado (usa MP3/WAV)`);
        continue;
      }
      const dur = await getAudioDuration(f);
      const baseName = f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
      newDrafts.push({
        id: crypto.randomUUID(),
        title: baseName,
        file: f,
        duration: dur,
        is_explicit: false,
      });
    }
    setTracks(prev => [...prev, ...newDrafts]);
  };

  const moveTrack = (idx: number, dir: -1 | 1) => {
    setTracks(prev => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const removeTrack = (idx: number) => setTracks(prev => prev.filter((_, i) => i !== idx));

  const updateTrack = (idx: number, patch: Partial<TrackDraft>) =>
    setTracks(prev => prev.map((t, i) => i === idx ? { ...t, ...patch } : t));

  // ---- Validations ----
  const step1Valid =
    info.title.trim().length > 0 &&
    info.artist_name.trim().length > 0 &&
    !!coverFile;

  const step2Valid =
    tracks.length >= 2 &&
    tracks.every(t => t.title.trim().length > 0 && t.file !== null);

  const canSubmit = step1Valid && step2Valid && rightsConfirmed && !submitting;

  // ---- Submit ----
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

  const handleSubmit = async () => {
    if (!user) return;
    if (!canSubmit) return;
    setSubmitting(true);
    setProgress(5);
    try {
      // 1) Subir portada
      const coverExt = coverFile!.name.split('.').pop() || 'jpg';
      const coverPath = `${user.id}/releases/${Date.now()}-cover.${coverExt}`;
      const cover = await uploadFile(coverFile!, coverPath);
      setProgress(15);

      // 2) Crear release
      const { data: release, error: releaseErr } = await (supabase as any)
        .from('releases')
        .insert({
          user_id: user.id,
          release_type: 'album',
          title: info.title.trim(),
          artist_name: info.artist_name.trim(),
          cover_url: cover.url,
          cover_path: cover.path,
          genre: info.genre.trim() || null,
          release_date: info.release_date || null,
          description: info.description.trim() || null,
          status: 'pending_review',
          total_tracks: tracks.length,
        })
        .select('id')
        .single();
      if (releaseErr || !release) throw releaseErr ?? new Error('No se pudo crear el álbum');
      const releaseId = release.id as string;
      setProgress(25);

      // 3) Subir pistas y crear submissions secuencialmente
      const total = tracks.length;
      for (let i = 0; i < tracks.length; i++) {
        const t = tracks[i];
        const audioExt = t.file!.name.split('.').pop() || 'mp3';
        const trackPath = `${user.id}/releases/${releaseId}/${i + 1}-${Date.now()}.${audioExt}`;
        const audio = await uploadFile(t.file!, trackPath);

        const { error: subErr } = await (supabase as any)
          .from('song_submissions')
          .insert({
            user_id: user.id,
            release_id: releaseId,
            release_type: 'album',
            track_number: i + 1,
            title: t.title.trim(),
            artist_name: info.artist_name.trim(),
            album_title: info.title.trim(),
            genre: info.genre.trim() || null,
            release_date: info.release_date || null,
            track_url: audio.url,
            track_path: audio.path,
            cover_url: cover.url,
            cover_path: cover.path,
            duration_seconds: t.duration || 0,
            is_explicit: t.is_explicit,
            is_explicit_declared: t.is_explicit,
            rights_confirmed: rightsConfirmed,
            status: 'pending',
          });
        if (subErr) throw subErr;

        setProgress(25 + Math.floor(((i + 1) / total) * 70));
      }

      setProgress(100);
      toast.success(`Álbum "${info.title}" enviado a revisión con ${tracks.length} pistas.`);
      onSubmitted?.();
      onOpenChange(false);
    } catch (e: any) {
      console.error('SubmitAlbumDialog error', e);
      toast.error(e?.message ?? 'Error al enviar el álbum');
    } finally {
      setSubmitting(false);
    }
  };

  const totalDuration = tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
  const fmtDur = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Disc3 className="h-5 w-5 text-primary" /> Subir álbum
          </DialogTitle>
          <DialogDescription>
            Paso {step} de 3 — {step === 1 ? 'Datos del álbum' : step === 2 ? 'Pistas' : 'Revisión y envío'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 mb-2">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-1 flex-1 rounded-full ${n <= step ? 'bg-primary' : 'bg-muted'}`}
            />
          ))}
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Título del álbum *</Label>
              <Input
                value={info.title}
                onChange={(e) => setInfo({ ...info, title: e.target.value })}
                placeholder="Ej: Verano Eterno"
              />
            </div>
            <div>
              <Label>Artista principal *</Label>
              <Input
                value={info.artist_name}
                onChange={(e) => setInfo({ ...info, artist_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Género</Label>
                <Input
                  value={info.genre}
                  onChange={(e) => setInfo({ ...info, genre: e.target.value })}
                  placeholder="Afrobeat, Pop, etc."
                />
              </div>
              <div>
                <Label>Fecha de lanzamiento</Label>
                <Input
                  type="date"
                  value={info.release_date}
                  onChange={(e) => setInfo({ ...info, release_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Descripción (opcional)</Label>
              <Textarea
                value={info.description}
                onChange={(e) => setInfo({ ...info, description: e.target.value })}
                rows={3}
                placeholder="Cuenta la historia del álbum…"
              />
            </div>
            <div>
              <Label>Portada del álbum *</Label>
              <div className="flex gap-3 items-start mt-1">
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="w-32 h-32 rounded-lg border-2 border-dashed border-border hover:border-primary flex items-center justify-center bg-card overflow-hidden"
                >
                  {coverPreview ? (
                    <img src={coverPreview} alt="Portada" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-2">
                      <ImageIcon className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                      <span className="text-xs text-muted-foreground">Subir portada</span>
                    </div>
                  )}
                </button>
                <p className="text-xs text-muted-foreground">
                  Mínimo 1400×1400px.<br />Formato JPG, PNG o WebP.
                </p>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => handleCover(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {tracks.length} pistas {tracks.length > 0 && `· ${fmtDur(totalDuration)}`}
                </p>
                <p className="text-xs text-muted-foreground">Mínimo 2, máximo {MAX_TRACKS}.</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => tracksInputRef.current?.click()}
                disabled={tracks.length >= MAX_TRACKS}
              >
                <Plus className="h-4 w-4 mr-1.5" /> Añadir pistas
              </Button>
              <input
                ref={tracksInputRef}
                type="file"
                accept="audio/mpeg,audio/mp3,audio/wav,audio/wave,audio/x-wav"
                multiple
                className="hidden"
                onChange={(e) => {
                  handleTracksAdd(e.target.files);
                  if (e.target) e.target.value = '';
                }}
              />
            </div>

            {tracks.length === 0 ? (
              <button
                type="button"
                onClick={() => tracksInputRef.current?.click()}
                className="w-full rounded-lg border-2 border-dashed border-border hover:border-primary py-10 flex flex-col items-center justify-center gap-2"
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm">Arrastra o haz clic para seleccionar varios archivos de audio</p>
                <p className="text-xs text-muted-foreground">MP3 o WAV · máx {MAX_AUDIO_MB}MB por pista</p>
              </button>
            ) : (
              <div className="space-y-2">
                {tracks.map((t, i) => (
                  <Card key={t.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground w-6 text-center">
                          {i + 1}
                        </span>
                        <Music className="h-4 w-4 text-primary flex-shrink-0" />
                        <Input
                          value={t.title}
                          onChange={(e) => updateTrack(i, { title: e.target.value })}
                          placeholder="Título de la pista"
                          className="h-8 flex-1"
                        />
                        <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                          {t.duration > 0 ? fmtDur(t.duration) : '—'}
                        </span>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" disabled={i === 0} onClick={() => moveTrack(i, -1)}>
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" disabled={i === tracks.length - 1} onClick={() => moveTrack(i, 1)}>
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeTrack(i)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pl-8 mt-2">
                        <p className="text-xs text-muted-foreground truncate flex-1">
                          {t.file?.name}
                        </p>
                        <label className="flex items-center gap-2 text-xs">
                          <Switch
                            checked={t.is_explicit}
                            onCheckedChange={(v) => updateTrack(i, { is_explicit: v })}
                          />
                          Explícita
                        </label>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {coverPreview && (
                    <img src={coverPreview} alt="" className="w-24 h-24 rounded-md object-cover" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Álbum</p>
                    <h3 className="font-bold text-lg truncate">{info.title}</h3>
                    <p className="text-sm text-muted-foreground truncate">{info.artist_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {tracks.length} pistas · {fmtDur(totalDuration)}
                      {info.genre && ` · ${info.genre}`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {tracks.map((t, i) => (
                <div key={t.id} className="flex items-center gap-2 text-sm py-1 border-b border-border/50 last:border-0">
                  <span className="font-mono text-xs text-muted-foreground w-6">{i + 1}</span>
                  <span className="flex-1 truncate">{t.title}</span>
                  {t.is_explicit && <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded">E</span>}
                  <span className="text-xs text-muted-foreground tabular-nums">{fmtDur(t.duration)}</span>
                </div>
              ))}
            </div>

            <label className="flex items-start gap-2 text-sm rounded-md border border-border p-3">
              <input
                type="checkbox"
                checked={rightsConfirmed}
                onChange={(e) => setRightsConfirmed(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Confirmo que poseo los derechos de distribución de todas las pistas de este álbum y acepto los términos de YUSIOP.
              </span>
            </label>

            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs flex gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <p>Cada pista será revisada individualmente. Recibirás una notificación por cada pista aprobada o rechazada.</p>
            </div>

            {submitting && <Progress value={progress} className="h-2" />}
          </div>
        )}

        <DialogFooter className="flex-row justify-between gap-2">
          <Button
            variant="ghost"
            onClick={() => step === 1 ? onOpenChange(false) : setStep(step - 1)}
            disabled={submitting}
          >
            {step === 1 ? 'Cancelar' : 'Atrás'}
          </Button>
          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 ? !step1Valid : !step2Valid}
            >
              Continuar
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {submitting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando…</>
              ) : (
                <><Upload className="h-4 w-4 mr-2" /> Enviar álbum a revisión</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SubmitAlbumDialog;
