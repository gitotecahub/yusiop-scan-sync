import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Upload, Music, AlertCircle, Play, Pause, Plus, Trash2, Users, Sparkles, Zap, ShieldAlert, Crown, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { validateCoverDimensions, MIN_COVER_DIMENSION } from '@/lib/imageValidation';
import { useAuthStore } from '@/stores/authStore';
import { useMySubscription } from '@/hooks/useSubscriptionPlans';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { formatXAFFixed, formatXafAsEur } from '@/lib/currency';
import PromoteReleaseBlock, { PromoData, PROMO_PLANS } from './PromoteReleaseBlock';
type ExpressTier = '72h' | '48h' | '24h';

const EXPRESS_OPTIONS: { tier: ExpressTier; priceXaf: number; label: string; sub: string }[] = [
  { tier: '72h', priceXaf: 5000, label: 'Express 72h', sub: 'Revisión prioritaria en 3 días' },
  { tier: '48h', priceXaf: 10000, label: 'Express 48h', sub: 'Revisión prioritaria en 2 días' },
  { tier: '24h', priceXaf: 15000, label: 'Express urgente 24h', sub: 'Máxima prioridad, en 1 día' },
];

// Días mínimos de antelación para lanzamiento estándar
const STANDARD_MIN_DAYS = 7;
const STANDARD_MAX_DAYS = 14;

const addDaysISO = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

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
  contact_email: string;
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
  express_tier?: ExpressTier | null;
  express_price_xaf?: number | null;
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
  nationality: string;
}

// Lista compacta de nacionalidades frecuentes (ISO 3166-1 alpha-2).
// "Otro" permite dejarlo vacío si no aplica.
const NATIONALITIES: { code: string; label: string }[] = [
  { code: 'ES', label: '🇪🇸 España' },
  { code: 'MX', label: '🇲🇽 México' },
  { code: 'AR', label: '🇦🇷 Argentina' },
  { code: 'CO', label: '🇨🇴 Colombia' },
  { code: 'CL', label: '🇨🇱 Chile' },
  { code: 'PE', label: '🇵🇪 Perú' },
  { code: 'VE', label: '🇻🇪 Venezuela' },
  { code: 'EC', label: '🇪🇨 Ecuador' },
  { code: 'UY', label: '🇺🇾 Uruguay' },
  { code: 'PY', label: '🇵🇾 Paraguay' },
  { code: 'BO', label: '🇧🇴 Bolivia' },
  { code: 'CR', label: '🇨🇷 Costa Rica' },
  { code: 'PA', label: '🇵🇦 Panamá' },
  { code: 'DO', label: '🇩🇴 R. Dominicana' },
  { code: 'CU', label: '🇨🇺 Cuba' },
  { code: 'PR', label: '🇵🇷 Puerto Rico' },
  { code: 'GT', label: '🇬🇹 Guatemala' },
  { code: 'HN', label: '🇭🇳 Honduras' },
  { code: 'SV', label: '🇸🇻 El Salvador' },
  { code: 'NI', label: '🇳🇮 Nicaragua' },
  { code: 'GQ', label: '🇬🇶 Guinea Ecuatorial' },
  { code: 'US', label: '🇺🇸 Estados Unidos' },
  { code: 'BR', label: '🇧🇷 Brasil' },
  { code: 'PT', label: '🇵🇹 Portugal' },
  { code: 'FR', label: '🇫🇷 Francia' },
  { code: 'IT', label: '🇮🇹 Italia' },
  { code: 'DE', label: '🇩🇪 Alemania' },
  { code: 'GB', label: '🇬🇧 Reino Unido' },
  { code: 'MA', label: '🇲🇦 Marruecos' },
  { code: 'OTHER', label: '🌍 Otro' },
];

const PREVIEW_LENGTH = 20;

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const SubmitSongDialog = ({ open, onOpenChange, defaultArtistName = '', onSubmitted, editing = null }: SubmitSongDialogProps) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { subscription } = useMySubscription();
  const isElite = subscription?.plan?.code === 'elite' && (subscription.status === 'active' || subscription.status === 'past_due');
  const isEdit = !!editing;

  const [formData, setFormData] = useState<FormState>({
    title: '',
    artist_name: defaultArtistName,
    album_title: '',
    genre: '',
    release_date: '',
    nationality: '',
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

  // Lanzamiento Express
  const [expressEnabled, setExpressEnabled] = useState(false);
  const [expressTier, setExpressTier] = useState<ExpressTier | null>(null);
  const [expressAck, setExpressAck] = useState(false);

  // Promoción de lanzamiento (banner Home)
  const [promo, setPromo] = useState<PromoData>({
    enabled: false,
    plan: null,
    ad_text: '',
    cta_text: 'Escuchar ahora',
    start_date: new Date().toISOString().split('T')[0],
  });

  const standardMinDate = addDaysISO(STANDARD_MIN_DAYS);
  const standardMaxDate = addDaysISO(STANDARD_MAX_DAYS);

  const collabSum = collaborators.reduce((acc, c) => acc + (Number(c.share_percent) || 0), 0);
  const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  const collabValid = !hasCollabs || (
    collaborators.length >= 2 &&
    Math.abs(collabSum - 100) < 0.01 &&
    collaborators.every(c => c.artist_name.trim().length > 0) &&
    collaborators.every(c => c.is_primary || (c.contact_email.trim().length > 0 && emailRe.test(c.contact_email.trim())))
  );

  // Razón por la que el botón "Enviar a revisión" está deshabilitado (para mostrar al usuario)
  const getDisabledReason = (): string | null => {
    if (uploading) return 'Subiendo…';
    if (!formData.title.trim()) return 'Falta el título';
    if (!formData.artist_name.trim()) return 'Falta el nombre del artista';
    if (!isEdit && !trackFile) return 'Falta seleccionar el archivo de audio';
    if (hasCollabs) {
      if (collaborators.length < 2) return 'Añade al menos 2 artistas en la colaboración';
      if (collaborators.some(c => !c.artist_name.trim())) return 'Todos los colaboradores necesitan un nombre artístico';
      const missingEmail = collaborators.find(c => !c.is_primary && !c.contact_email.trim());
      if (missingEmail) return `Falta el email de ${missingEmail.artist_name || 'un colaborador'}`;
      const badEmail = collaborators.find(c => !c.is_primary && c.contact_email.trim() && !emailRe.test(c.contact_email.trim()));
      if (badEmail) return `Email inválido: ${badEmail.contact_email}`;
      if (Math.abs(collabSum - 100) > 0.01) return `La suma de splits debe ser 100% (actual: ${collabSum}%)`;
    }
    if (expressEnabled) {
      if (!expressTier) return 'Selecciona un nivel de Lanzamiento Express';
      if (!isElite && !expressAck) return 'Debes confirmar el aviso del Lanzamiento Express';
    } else if (formData.release_date) {
      if (formData.release_date < standardMinDate) {
        return `La fecha estándar requiere mínimo ${STANDARD_MIN_DAYS} días desde hoy. Activa "Lanzamiento Express" para acelerar.`;
      }
    }
    return null;
  };
  const disabledReason = getDisabledReason();

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
        nationality: (editing as any).nationality ?? '',
      });
      setAudioDuration(editing.duration_seconds || 0);
      setPreviewStart(editing.preview_start_seconds ?? 0);
      setAudioUrl(editing.track_url || null);
      // Express previo (si lo tenía)
      if (editing.express_tier) {
        setExpressEnabled(true);
        setExpressTier(editing.express_tier);
        setExpressAck(true);
      } else {
        setExpressEnabled(false);
        setExpressTier(null);
        setExpressAck(false);
      }
      // Cargar colaboradores existentes del envío
      (async () => {
        const { data } = await supabase
          .from('song_collaborators')
          .select('id,artist_name,share_percent,is_primary,role,contact_email')
          .eq('submission_id', editing.id)
          .order('is_primary', { ascending: false });
        if (data && data.length > 0) {
          setHasCollabs(true);
          setCollaborators(data.map((d: any) => ({
            id: d.id,
            artist_name: d.artist_name,
            share_percent: Number(d.share_percent),
            is_primary: !!d.is_primary,
            role: (d.role as CollabRole) ?? 'featuring',
            contact_email: d.contact_email ?? '',
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
        nationality: '',
      });
      setAudioDuration(0);
      setPreviewStart(0);
      setAudioUrl(null);
      setHasCollabs(false);
      setCollaborators([]);
      setExpressEnabled(false);
      setExpressTier(null);
      setExpressAck(false);
      setPromo({
        enabled: false,
        plan: null,
        ad_text: '',
        cta_text: 'Escuchar ahora',
        start_date: new Date().toISOString().split('T')[0],
      });
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
        { artist_name: formData.artist_name || defaultArtistName, share_percent: 50, is_primary: true, role: 'featuring', contact_email: '' },
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
      const allowedMime = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav', 'audio/vnd.wave'];
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      const allowedExt = ['mp3', 'wav'];
      if (!allowedMime.includes(file.type) && !allowedExt.includes(ext)) {
        toast.error('Formato de audio no soportado. Usa MP3 o WAV.');
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
      try {
        await validateCoverDimensions(file);
      } catch (err: any) {
        toast.error(err?.message || 'La portada no cumple los requisitos.');
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
    if (!isEdit && !coverFile && !editing?.cover_url) return toast.error('La portada es obligatoria'), false;
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
      role: c.role,
      contact_email: c.is_primary ? null : c.contact_email.trim().toLowerCase(),
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

      // Datos del Lanzamiento Express (si está activo)
      // Para usuarios Elite el coste es 0 (incluido en la suscripción).
      const baseExpressOpt = expressEnabled && expressTier
        ? EXPRESS_OPTIONS.find(o => o.tier === expressTier) ?? null
        : null;
      const expressOpt = baseExpressOpt
        ? { ...baseExpressOpt, priceXaf: isElite ? 0 : baseExpressOpt.priceXaf }
        : null;
      const nowIso = new Date().toISOString();

      if (isEdit && editing) {
        const update: Record<string, any> = {
          title: formData.title.trim(),
          artist_name: formData.artist_name.trim(),
          album_title: formData.album_title.trim() || null,
          genre: formData.genre.trim() || null,
          release_date: formData.release_date || null,
          nationality: formData.nationality || null,
          status: 'pending',
          rejection_reason: null,
          reviewed_at: null,
          reviewed_by: null,
          express_tier: expressOpt?.tier ?? null,
          express_price_xaf: expressOpt?.priceXaf ?? null,
          // Si ya tenía express previo no resetear paid/requested; si lo activa ahora, marcarlo
          ...(expressOpt && !editing.express_tier
            ? { express_requested_at: nowIso, express_paid_at: nowIso }
            : {}),
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
        toast.success(expressOpt
          ? `Envío actualizado · Revisión prioritaria ${expressOpt.tier} activada`
          : 'Envío actualizado y reenviado a revisión');
        // Lanzar análisis de copyright en background (no bloqueante)
        supabase.functions
          .invoke('analyze-copyright', { body: { submission_id: editing.id } })
          .catch((e) => console.warn('Copyright check failed (background):', e));
      } else {
        if (!trackUp) throw new Error('Falta archivo de audio');
        const { data: inserted, error: dbError } = await supabase.from('song_submissions').insert({
          user_id: user.id,
          title: formData.title.trim(),
          artist_name: formData.artist_name.trim(),
          album_title: formData.album_title.trim() || null,
          genre: formData.genre.trim() || null,
          release_date: formData.release_date || null,
          nationality: formData.nationality || null,
          duration_seconds: duration,
          preview_start_seconds: safePreviewStart,
          track_url: trackUp.url,
          track_path: trackUp.path,
          cover_url: cover?.url ?? null,
          cover_path: cover?.path ?? null,
          express_tier: expressOpt?.tier ?? null,
          express_price_xaf: expressOpt?.priceXaf ?? null,
          express_requested_at: expressOpt ? nowIso : null,
          express_paid_at: expressOpt ? nowIso : null,
        } as any).select('id').single();
        if (dbError) throw dbError;
        if (inserted?.id) {
          await persistCollaborators(inserted.id);
          // Lanzar análisis de copyright en background
          supabase.functions
            .invoke('analyze-copyright', { body: { submission_id: inserted.id } })
            .catch((e) => console.warn('Copyright check failed (background):', e));
          // Notificar a colaboradores no principales (en background)
          if (hasCollabs) {
            supabase.functions
              .invoke('notify-collaborators', {
                body: {
                  submission_id: inserted.id,
                  phase: 'submitted',
                  app_url: window.location.origin,
                },
              })
              .catch((e) => console.warn('notify-collaborators (submitted) failed:', e));
          }
        }
        setProgress(100);
        toast.success(expressOpt
          ? `Canción enviada · Revisión prioritaria ${expressOpt.tier} activada`
          : 'Canción enviada a revisión. Analizando copyright…');

        // Si el artista activó la promoción del lanzamiento, crear la campaña y abrir checkout
        if (promo.enabled && promo.plan && inserted?.id) {
          const plan = PROMO_PLANS.find(p => p.id === promo.plan);
          if (plan) {
            try {
              // Resolver artist_id propio (si existe)
              const { data: artistRow } = await supabase
                .from('song_collaborators')
                .select('id')
                .limit(1)
                .maybeSingle();
              void artistRow;

              const coverImg = cover?.url ?? editing?.cover_url ?? null;
              const { data: campaign, error: campErr } = await supabase
                .from('ad_campaigns')
                .insert({
                  user_id: user.id,
                  campaign_type: 'artist_release',
                  title: promo.ad_text.trim() || formData.title.trim(),
                  subtitle: formData.artist_name.trim(),
                  image_url: coverImg,
                  cta_text: promo.cta_text.trim() || 'Escuchar ahora',
                  cta_url: `/catalog?song=${inserted.id}`,
                  duration_days: plan.days,
                  price_eur: plan.priceEur,
                  status: 'pending_payment',
                  payment_status: 'unpaid',
                  placement: 'home_top_banner',
                })
                .select('id')
                .single();

              if (campErr) throw campErr;

              const { data: checkout, error: chkErr } = await supabase.functions.invoke(
                'create-ad-checkout',
                { body: { campaign_id: campaign.id } },
              );
              if (chkErr) throw chkErr;
              if (checkout?.url) {
                toast.success('Redirigiendo al pago de la promoción…');
                window.open(checkout.url, '_blank');
              }
            } catch (e: any) {
              console.error('Promo campaign creation failed', e);
              toast.error('No se pudo crear la promoción: ' + (e.message ?? 'error'));
            }
          }
        }
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
              <Label htmlFor="artist">Artista principal *</Label>
              <Input
                id="artist"
                value={formData.artist_name}
                onChange={(e) => {
                  const v = e.target.value;
                  setFormData((p) => ({ ...p, artist_name: v }));
                  // Mantener sincronizado el "principal" en la lista de colaboradores
                  setCollaborators((prev) => prev.map((c) => c.is_primary ? { ...c, artist_name: v } : c));
                }}
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
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="release_date">Fecha de lanzamiento</Label>
                <button
                  type="button"
                  onClick={() => {
                    setExpressEnabled((v) => !v);
                    if (expressEnabled) {
                      setExpressTier(null);
                      setExpressAck(false);
                    }
                  }}
                  className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full transition-all inline-flex items-center gap-1 ${
                    expressEnabled
                      ? 'bg-gradient-to-r from-[hsl(220,90%,55%)] via-[hsl(265,85%,60%)] to-[hsl(180,80%,50%)] text-white shadow-[0_0_18px_hsl(265_85%_60%/0.55)]'
                      : 'border border-primary/40 text-primary hover:bg-primary/10'
                  }`}
                >
                  <Zap className="h-3 w-3" />
                  {expressEnabled ? 'Express activado' : 'Lanzamiento prioritario'}
                  {isElite && !expressEnabled && (
                    <Crown className="h-3 w-3 text-[hsl(45,95%,60%)]" />
                  )}
                </button>
              </div>
              <Input
                id="release_date"
                type="date"
                value={formData.release_date}
                min={expressEnabled ? undefined : standardMinDate}
                max={expressEnabled ? undefined : standardMaxDate}
                disabled={expressEnabled}
                onChange={(e) => setFormData((p) => ({ ...p, release_date: e.target.value }))}
              />
              {!expressEnabled && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Lanzamiento estándar: entre {STANDARD_MIN_DAYS} y {STANDARD_MAX_DAYS} días desde hoy.
                </p>
              )}
              {expressEnabled && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  La fecha la fijará el equipo según el nivel prioritario elegido.
                </p>
              )}
            </div>
          </div>

          {/* Sección Lanzamiento Express */}
          {expressEnabled && (
            <div className="relative rounded-xl p-[1px] bg-gradient-to-br from-[hsl(220,90%,55%)] via-[hsl(265,85%,60%)] to-[hsl(180,80%,50%)] shadow-[0_0_30px_hsl(265_85%_60%/0.25)]">
              <div className="rounded-[11px] bg-background p-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-[hsl(220,90%,55%)] via-[hsl(265,85%,60%)] to-[hsl(180,80%,50%)] flex items-center justify-center shadow-lg flex-shrink-0">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold bg-gradient-to-r from-[hsl(220,90%,65%)] via-[hsl(265,85%,70%)] to-[hsl(180,80%,55%)] bg-clip-text text-transparent">
                      Lanzamiento prioritario
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Publica tu música con revisión prioritaria.
                    </p>
                  </div>
                  {isElite && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-[hsl(280,85%,45%)] via-[hsl(250,95%,45%)] to-[hsl(188,85%,45%)] text-white text-[10px] font-bold uppercase tracking-wider shadow-lg">
                      <Crown className="h-3 w-3" /> Incluido en Elite
                    </div>
                  )}
                </div>

                {!isElite && (
                  <div className="rounded-lg border border-primary/30 bg-gradient-to-r from-[hsl(280,85%,45%)]/10 via-[hsl(250,95%,45%)]/10 to-[hsl(188,85%,45%)]/10 p-3">
                    <div className="flex items-start gap-2">
                      <Lock className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <div className="text-xs flex-1 space-y-2">
                        <p className="font-semibold text-foreground">
                          Disponible gratis con YUSIOP Elite
                        </p>
                        <p className="text-muted-foreground">
                          Mejora tu plan para acceder al lanzamiento prioritario sin coste adicional, o paga por uso a continuación.
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => { onOpenChange(false); navigate('/subscriptions'); }}
                          className="bg-gradient-to-r from-[hsl(280,85%,45%)] via-[hsl(250,95%,45%)] to-[hsl(188,85%,45%)] hover:opacity-90 text-white h-7 text-[11px] font-semibold"
                        >
                          <Crown className="h-3 w-3 mr-1" /> Mejorar a Elite
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid gap-2">
                  {EXPRESS_OPTIONS.map((opt) => {
                    const selected = expressTier === opt.tier;
                    return (
                      <button
                        key={opt.tier}
                        type="button"
                        onClick={() => setExpressTier(opt.tier)}
                        className={`relative text-left rounded-lg p-3 transition-all border ${
                          selected
                            ? 'border-transparent bg-gradient-to-r from-[hsl(220,90%,55%)]/15 via-[hsl(265,85%,60%)]/15 to-[hsl(180,80%,50%)]/15 ring-2 ring-[hsl(265,85%,60%)] shadow-[0_0_20px_hsl(265_85%_60%/0.4)]'
                            : 'border-border bg-muted/30 hover:border-primary/40 hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`h-9 w-9 rounded-md flex items-center justify-center text-sm font-bold ${
                              selected
                                ? 'bg-gradient-to-br from-[hsl(220,90%,55%)] via-[hsl(265,85%,60%)] to-[hsl(180,80%,50%)] text-white'
                                : 'bg-muted text-foreground'
                            }`}>
                              {opt.tier}
                            </div>
                            <div>
                              <div className="font-semibold text-sm">{opt.label}</div>
                              <div className="text-[11px] text-muted-foreground">{opt.sub}</div>
                            </div>
                          </div>
                          <div className={`flex flex-col items-end leading-tight whitespace-nowrap ${selected ? 'text-primary' : 'text-foreground'}`}>
                            {isElite ? (
                              <span className="text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-[hsl(220,90%,65%)] via-[hsl(265,85%,70%)] to-[hsl(180,80%,55%)] bg-clip-text text-transparent">
                                Incluido
                              </span>
                            ) : (
                              <>
                                <span className="text-sm font-bold tabular-nums">{formatXafAsEur(opt.priceXaf)}</span>
                                <span className="text-[10px] font-normal text-muted-foreground tabular-nums">{formatXAFFixed(opt.priceXaf)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {!isElite && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                    <div className="flex items-start gap-2">
                      <ShieldAlert className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-foreground/80 space-y-2">
                        <p>
                          El lanzamiento express <strong>no garantiza aprobación automática</strong>. La
                          canción seguirá pasando por revisión de derechos, calidad de audio,
                          portada y datos del artista. Si el contenido no cumple los requisitos,
                          el lanzamiento podrá retrasarse o rechazarse.
                        </p>
                        <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-muted-foreground">
                          <li>El pago se realiza antes de enviar la solicitud.</li>
                          <li>Si el retraso es culpa de YUSIOP: reembolso o crédito interno.</li>
                          <li>Si es por datos/portada/audio/derechos incorrectos: <strong>no</strong> se devuelve el coste express.</li>
                        </ul>
                        <label className="flex items-start gap-2 pt-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={expressAck}
                            onChange={(e) => setExpressAck(e.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                          />
                          <span className="text-xs font-medium">
                            He leído y acepto las condiciones del Lanzamiento Express.
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="nationality">Nacionalidad del artista</Label>
            <Select
              value={formData.nationality || undefined}
              onValueChange={(v) => setFormData((p) => ({ ...p, nationality: v }))}
            >
              <SelectTrigger id="nationality">
                <SelectValue placeholder="Selecciona un país (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {NATIONALITIES.map((n) => (
                  <SelectItem key={n.code} value={n.code}>{n.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1">
              Nos ayuda a destacar tu música en secciones por país y para promociones en TV.
            </p>
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

          {!isEdit && (
            <PromoteReleaseBlock
              value={promo}
              onChange={setPromo}
              defaultTitle={formData.title || formData.artist_name}
            />
          )}

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
                accept=".mp3,.wav,audio/mpeg,audio/wav,audio/x-wav"
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
                    : 'Seleccionar audio (MP3 o WAV)'}
              </Button>
            </div>

            <div>
              <Label>Portada <span className="text-destructive">*</span></Label>
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
              <p className="text-xs text-muted-foreground mt-1.5">
                Mínimo {MIN_COVER_DIMENSION} x {MIN_COVER_DIMENSION} px · Cuadrada · JPG, PNG o WebP
              </p>
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
              <div className="space-y-3">
                {collaborators.map((c, i) => (
                  <div key={i} className="rounded-lg border border-border/60 bg-background/40 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] uppercase tracking-wider font-semibold ${c.is_primary ? 'text-primary' : 'text-muted-foreground'}`}>
                        {c.is_primary ? 'Artista principal' : `Colaborador ${i}`}
                      </span>
                      {!c.is_primary && (
                        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeCollaborator(i)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-12 gap-2">
                      <Input
                        className="col-span-12 sm:col-span-6"
                        placeholder="Nombre artístico"
                        value={c.artist_name}
                        onChange={(e) => {
                          updateCollab(i, { artist_name: e.target.value });
                          // Si edito el principal aquí, también actualizo el campo de arriba
                          if (c.is_primary) {
                            setFormData((p) => ({ ...p, artist_name: e.target.value }));
                          }
                        }}
                        maxLength={80}
                        disabled={c.is_primary}
                      />

                      <div className="col-span-7 sm:col-span-4">
                        {c.is_primary ? (
                          <div className="h-10 flex items-center px-3 rounded-md border border-input bg-muted/40 text-sm text-muted-foreground">
                            Principal
                          </div>
                        ) : (
                          <Select
                            value={c.role}
                            onValueChange={(v) => updateCollab(i, { role: v as CollabRole })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Rol" />
                            </SelectTrigger>
                            <SelectContent>
                              {COLLAB_ROLES.map((r) => (
                                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      <div className="col-span-5 sm:col-span-2 flex items-center gap-1">
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
                    </div>

                    {!c.is_primary && (
                      <div className="space-y-1">
                        <Input
                          type="email"
                          placeholder="Email del colaborador *"
                          value={c.contact_email}
                          onChange={(e) => updateCollab(i, { contact_email: e.target.value })}
                          maxLength={255}
                          autoComplete="off"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Le avisaremos por email cuando se publique la canción para que pueda reclamar su parte. Si aún no tiene cuenta, le invitaremos a registrarse.
                        </p>
                      </div>
                    )}
                  </div>
                ))}

                <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={addCollaborator}>
                    <Plus className="h-4 w-4 mr-1" /> Añadir artista
                  </Button>
                  <span className={`text-sm font-semibold ${Math.abs(collabSum - 100) < 0.01 ? 'text-primary' : 'text-destructive'}`}>
                    Total: {collabSum}% {Math.abs(collabSum - 100) < 0.01 ? '✓' : '(debe ser 100%)'}
                  </span>
                </div>

                {/* Vista previa del nombre que se mostrará en el catálogo */}
                <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-primary font-semibold">
                    <Sparkles className="h-3.5 w-3.5" /> Cómo aparecerá en el catálogo
                  </div>
                  <p className="font-display font-bold text-base mt-1 break-words">
                    {buildDisplayArtist(formData.artist_name, collaborators) || '—'}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Solo los colaboradores con rol <strong>Featuring</strong> aparecen en el nombre. El resto (productor, intérprete, etc.) se guardan en los créditos de la canción.
                  </p>
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
                    className="yusiop-slider"
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

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {disabledReason && !uploading && (
            <p className="text-xs text-destructive sm:mr-auto sm:self-center">
              {disabledReason}
            </p>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!!disabledReason}
          >
            {uploading ? 'Guardando…' : isEdit ? 'Guardar y reenviar' : 'Enviar a revisión'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SubmitSongDialog;
