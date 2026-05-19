import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Upload, Music, Plus, Trash2, ArrowUp, ArrowDown, Disc3, Image as ImageIcon,
  ShieldAlert, Loader2, Zap, Crown, Lock, Users, ChevronDown, ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { validateCoverDimensions } from '@/lib/imageValidation';
import { useMySubscription } from '@/hooks/useSubscriptionPlans';
import { formatXAFFixed, formatXafAsEur } from '@/lib/currency';
import PromoteReleaseBlock, { PromoData, PROMO_PLANS } from './PromoteReleaseBlock';

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

type CollabRole = 'featuring' | 'producer' | 'performer' | 'composer' | 'remix';
const COLLAB_ROLES: { value: CollabRole; label: string }[] = [
  { value: 'featuring', label: 'Featuring' },
  { value: 'producer', label: 'Productor' },
  { value: 'performer', label: 'Intérprete' },
  { value: 'composer', label: 'Compositor' },
  { value: 'remix', label: 'Remix' },
];

interface CollabRow {
  artist_name: string;
  share_percent: number;
  is_primary: boolean;
  role: CollabRole;
  contact_email: string;
}

interface TrackDraft {
  id: string;
  title: string;
  file: File | null;
  duration: number;
  is_explicit: boolean;
  has_collabs: boolean;
  expanded: boolean;
  collaborators: CollabRow[];
}

type ExpressTier = '72h' | '48h' | '24h';
const EXPRESS_OPTIONS: { tier: ExpressTier; priceXaf: number; label: string; sub: string }[] = [
  { tier: '72h', priceXaf: 5000, label: 'Express 72h', sub: 'Revisión prioritaria en 3 días' },
  { tier: '48h', priceXaf: 10000, label: 'Express 48h', sub: 'Revisión prioritaria en 2 días' },
  { tier: '24h', priceXaf: 15000, label: 'Express urgente 24h', sub: 'Máxima prioridad, en 1 día' },
];

const MAX_AUDIO_MB = 50;
const MAX_TRACKS = 30;
const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const getAudioDuration = (file: File): Promise<number> =>
  new Promise((resolve) => {
    const audio = new Audio();
    audio.onloadedmetadata = () => resolve(Math.floor(audio.duration));
    audio.onerror = () => resolve(0);
    audio.src = URL.createObjectURL(file);
  });

const makePrimaryCollab = (name: string): CollabRow => ({
  artist_name: name,
  share_percent: 50,
  is_primary: true,
  role: 'featuring',
  contact_email: '',
});

const SubmitAlbumDialog = ({ open, onOpenChange, defaultArtistName = '', onSubmitted }: Props) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { subscription } = useMySubscription();
  const isElite = subscription?.plan?.code === 'elite' && (subscription.status === 'active' || subscription.status === 'past_due');

  const [step, setStep] = useState(1);
  const [info, setInfo] = useState<AlbumInfo>({
    title: '', artist_name: defaultArtistName, genre: '', release_date: '', description: '',
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [tracks, setTracks] = useState<TrackDraft[]>([]);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);

  // Express (aplica a todo el álbum)
  const [expressEnabled, setExpressEnabled] = useState(false);
  const [expressTier, setExpressTier] = useState<ExpressTier | null>(null);
  const [expressAck, setExpressAck] = useState(false);

  // Promoción
  const [promo, setPromo] = useState<PromoData>({
    enabled: false, plan: null, ad_text: '',
    cta_text: 'Escuchar ahora', start_date: new Date().toISOString().split('T')[0],
  });

  // Prepayment (pago previo)
  const [paidPrepaymentId, setPaidPrepaymentId] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const LS_KEY = 'yusiop:prepay:album';

  const coverInputRef = useRef<HTMLInputElement>(null);
  const tracksInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setInfo({ title: '', artist_name: defaultArtistName, genre: '', release_date: '', description: '' });
    setCoverFile(null); setCoverPreview(null);
    setTracks([]); setRightsConfirmed(false);
    setSubmitting(false); setProgress(0);
    setExpressEnabled(false); setExpressTier(null); setExpressAck(false);
    setPromo({
      enabled: false, plan: null, ad_text: '',
      cta_text: 'Escuchar ahora', start_date: new Date().toISOString().split('T')[0],
    });
    setPaidPrepaymentId(null);

    // Restaurar tras volver del Stripe Checkout (prepayment)
    (async () => {
      try {
        const url = new URL(window.location.href);
        const status = url.searchParams.get('prepayment');
        const pid = url.searchParams.get('pid');
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (status === 'success' && pid && saved.prepayment_id === pid) {
          const { data: pp } = await supabase
            .from('submission_prepayments')
            .select('status')
            .eq('id', pid)
            .maybeSingle();
          if (pp?.status === 'paid') {
            setInfo(saved.info);
            setExpressEnabled(!!saved.expressEnabled);
            setExpressTier(saved.expressTier ?? null);
            setExpressAck(true);
            setPromo(saved.promo);
            setRightsConfirmed(!!saved.rightsConfirmed);
            setPaidPrepaymentId(pid);
            setStep(2);
            toast.success('Pago confirmado. Sube ahora las pistas y la portada para enviar el álbum.');
            url.searchParams.delete('prepayment');
            url.searchParams.delete('pid');
            window.history.replaceState({}, '', url.toString());
          }
        } else if (status === 'cancelled' && pid && saved.prepayment_id === pid) {
          toast.info('Pago cancelado. Tu progreso del álbum se mantiene.');
          url.searchParams.delete('prepayment');
          url.searchParams.delete('pid');
          window.history.replaceState({}, '', url.toString());
          setInfo(saved.info);
          setExpressEnabled(!!saved.expressEnabled);
          setExpressTier(saved.expressTier ?? null);
          setExpressAck(true);
          setPromo(saved.promo);
          setRightsConfirmed(!!saved.rightsConfirmed);
        }
      } catch (e) {
        console.warn('album prepayment restore failed', e);
      }
    })();
  }, [open, defaultArtistName]);

  const handleCover = async (f: File | null) => {
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
      toast.error('Formato no soportado. Usa JPG, PNG o WebP.');
      return;
    }
    try { await validateCoverDimensions(f); }
    catch (e: any) { toast.error(e?.message ?? 'La portada no cumple los requisitos.'); return; }
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
  };

  const handleTracksAdd = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = MAX_TRACKS - tracks.length;
    if (remaining <= 0) { toast.error(`Máximo ${MAX_TRACKS} pistas por álbum.`); return; }
    const arr = Array.from(files).slice(0, remaining);
    const newDrafts: TrackDraft[] = [];
    for (const f of arr) {
      if (f.size > MAX_AUDIO_MB * 1024 * 1024) {
        toast.error(`${f.name}: supera ${MAX_AUDIO_MB}MB`); continue;
      }
      const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
      const allowedMime = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav'];
      if (!allowedMime.includes(f.type) && !['mp3', 'wav'].includes(ext)) {
        toast.error(`${f.name}: formato no soportado (usa MP3/WAV)`); continue;
      }
      const dur = await getAudioDuration(f);
      const baseName = f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
      newDrafts.push({
        id: crypto.randomUUID(),
        title: baseName, file: f, duration: dur,
        is_explicit: false, has_collabs: false, expanded: false, collaborators: [],
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

  // ---- Colaboradores por pista ----
  const enableTrackCollabs = (idx: number) => {
    setTracks(prev => prev.map((t, i) => {
      if (i !== idx) return t;
      if (t.collaborators.length > 0) return { ...t, has_collabs: true, expanded: true };
      return {
        ...t,
        has_collabs: true,
        expanded: true,
        collaborators: [
          makePrimaryCollab(info.artist_name),
          { artist_name: '', share_percent: 50, is_primary: false, role: 'featuring', contact_email: '' },
        ],
      };
    }));
  };
  const disableTrackCollabs = (idx: number) =>
    updateTrack(idx, { has_collabs: false, collaborators: [] });
  const addCollab = (tIdx: number) => setTracks(prev => prev.map((t, i) =>
    i !== tIdx ? t : { ...t, collaborators: [...t.collaborators, { artist_name: '', share_percent: 0, is_primary: false, role: 'featuring', contact_email: '' }] }
  ));
  const removeCollab = (tIdx: number, cIdx: number) => setTracks(prev => prev.map((t, i) =>
    i !== tIdx ? t : { ...t, collaborators: t.collaborators.filter((_, j) => j !== cIdx) }
  ));
  const updateCollab = (tIdx: number, cIdx: number, patch: Partial<CollabRow>) =>
    setTracks(prev => prev.map((t, i) =>
      i !== tIdx ? t : { ...t, collaborators: t.collaborators.map((c, j) => j === cIdx ? { ...c, ...patch } : c) }
    ));

  // Mantén el nombre del principal sincronizado al cambiar el artista del álbum
  useEffect(() => {
    setTracks(prev => prev.map(t => ({
      ...t,
      collaborators: t.collaborators.map(c => c.is_primary ? { ...c, artist_name: info.artist_name } : c),
    })));
  }, [info.artist_name]);

  // ---- Validaciones ----
  const step1Valid =
    info.title.trim().length > 0 &&
    info.artist_name.trim().length > 0 &&
    !!coverFile;

  const tracksBaseValid = tracks.length >= 2 && tracks.every(t => t.title.trim().length > 0 && t.file !== null);
  const trackCollabValid = tracks.every(t => {
    if (!t.has_collabs) return true;
    if (t.collaborators.length < 2) return false;
    const sum = t.collaborators.reduce((a, c) => a + (Number(c.share_percent) || 0), 0);
    if (Math.abs(sum - 100) > 0.01) return false;
    if (t.collaborators.some(c => !c.artist_name.trim())) return false;
    if (t.collaborators.some(c => !c.is_primary && (!c.contact_email.trim() || !emailRe.test(c.contact_email.trim())))) return false;
    return true;
  });
  const step2Valid = tracksBaseValid && trackCollabValid;

  const expressOpt = expressEnabled && expressTier
    ? EXPRESS_OPTIONS.find(o => o.tier === expressTier)!
    : null;
  const expressPriceXaf = expressOpt ? (isElite ? 0 : expressOpt.priceXaf) : 0;
  const expressNeedsAck = expressEnabled && !isElite && !expressAck;
  const expressOk = !expressEnabled || (expressTier !== null && !expressNeedsAck);

  // ===== Pago previo (Express + Promo) =====
  const needsPrepayment = (() => {
    const expressPay = expressEnabled && expressTier && !isElite;
    const promoPay = !!(promo.enabled && promo.plan);
    return !!expressPay || promoPay;
  })();
  const prepaymentReady = !needsPrepayment || !!paidPrepaymentId;

  const canSubmit = step1Valid && step2Valid && rightsConfirmed && expressOk && prepaymentReady && !submitting;

  const handlePay = async () => {
    if (!user) return;
    if (!info.title.trim() || !info.artist_name.trim()) {
      toast.error('Indica el título y el artista del álbum antes de pagar.');
      return;
    }
    if (expressEnabled && !expressTier) {
      toast.error('Selecciona un nivel de Lanzamiento Express.');
      return;
    }
    if (promo.enabled && !promo.plan) {
      toast.error('Selecciona un plan de Promoción.');
      return;
    }
    setPaying(true);
    try {
      const draft = {
        prepayment_id: null as string | null,
        info,
        expressEnabled,
        expressTier,
        promo,
        rightsConfirmed,
      };
      const returnUrl = window.location.origin + window.location.pathname;
      const { data, error } = await supabase.functions.invoke(
        'create-prepayment-checkout',
        {
          body: {
            kind: 'album',
            context_title: info.title.trim(),
            context_artist_name: info.artist_name.trim(),
            express_tier: expressEnabled && !isElite ? expressTier : null,
            promo_plan: promo.enabled ? promo.plan : null,
            promo_ad_text: promo.ad_text || null,
            promo_cta_text: promo.cta_text || null,
            promo_start_date: promo.start_date || null,
            success_url: returnUrl,
            cancel_url: returnUrl,
          },
        },
      );
      if (error || !data?.url) {
        throw new Error(error?.message ?? 'No se pudo iniciar el pago');
      }
      draft.prepayment_id = data.prepayment_id;
      localStorage.setItem(LS_KEY, JSON.stringify(draft));
      window.location.href = data.url;
    } catch (e: any) {
      console.error('album handlePay error', e);
      toast.error(e?.message ?? 'Error al iniciar el pago');
      setPaying(false);
    }
  };

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

  const persistTrackCollabs = async (submissionId: string, collabs: CollabRow[]) => {
    if (collabs.length === 0) return;
    const rows = collabs.map(c => ({
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
    if (!user || !canSubmit) return;
    setSubmitting(true);
    setProgress(5);
    try {
      // 1) Portada
      const coverExt = coverFile!.name.split('.').pop() || 'jpg';
      const coverPath = `${user.id}/releases/${Date.now()}-cover.${coverExt}`;
      const cover = await uploadFile(coverFile!, coverPath);
      setProgress(15);

      // 2) Release
      const nowIso = new Date().toISOString();
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

      // 3) Pistas + colaboradores
      const expressNeedsPayment = !!expressOpt && !isElite && expressOpt.priceXaf > 0;
      const promoEnabled = !!(promo.enabled && promo.plan);
      const requiresPayment = expressNeedsPayment || promoEnabled;
      // Si ya pagó por adelantado, las pistas entran como pending directamente
      const initialStatus = (requiresPayment && !paidPrepaymentId) ? 'pending_payment' : 'pending';
      const expressAlreadyPaid = !!expressOpt && (!expressNeedsPayment || !!paidPrepaymentId);

      const insertedIds: string[] = [];
      const total = tracks.length;
      for (let i = 0; i < tracks.length; i++) {
        const t = tracks[i];
        const audioExt = t.file!.name.split('.').pop() || 'mp3';
        const trackPath = `${user.id}/releases/${releaseId}/${i + 1}-${Date.now()}.${audioExt}`;
        const audio = await uploadFile(t.file!, trackPath);

        // Solo la primera pista lleva el precio del Express (pago único por álbum)
        const isFirst = i === 0;
        const trackExpressPrice = expressOpt
          ? (isFirst ? expressPriceXaf : 0)
          : null;
        const expressPaidAt = expressAlreadyPaid ? nowIso : null;

        const { data: inserted, error: subErr } = await (supabase as any)
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
            status: initialStatus,
            express_tier: expressOpt?.tier ?? null,
            express_price_xaf: trackExpressPrice,
            express_requested_at: expressOpt ? nowIso : null,
            express_paid_at: expressPaidAt,
          })
          .select('id')
          .single();
        if (subErr) throw subErr;
        const sid = inserted.id as string;
        insertedIds.push(sid);
        if (t.has_collabs) await persistTrackCollabs(sid, t.collaborators);

        setProgress(25 + Math.floor(((i + 1) / total) * 60));
      }

      // 4) Campaña promocional (vinculada a la primera pista)
      let campaignId: string | null = null;
      if (promoEnabled && insertedIds[0]) {
        const plan = PROMO_PLANS.find(p => p.id === promo.plan);
        if (plan) {
          const { data: campaign, error: campErr } = await supabase
            .from('ad_campaigns')
            .insert({
              user_id: user.id,
              submission_id: insertedIds[0],
              campaign_type: 'artist_release',
              title: promo.ad_text.trim() || info.title.trim(),
              subtitle: info.artist_name.trim(),
              image_url: cover.url,
              cta_text: promo.cta_text.trim() || 'Escuchar ahora',
              cta_url: `/catalog?release=${releaseId}`,
              duration_days: plan.days,
              price_eur: plan.priceEur,
              start_date: promo.start_date ? new Date(promo.start_date).toISOString() : null,
              status: 'pending_payment',
              payment_status: 'unpaid',
              placement: 'home_top_banner',
            } as any)
            .select('id').single();
          if (campErr) {
            console.error('Promo campaign creation failed', campErr);
            toast.error('No se pudo crear la promoción: ' + campErr.message);
          } else {
            campaignId = campaign.id;
          }
        }
      }
      setProgress(90);

      // 5) Si pagó por adelantado, consumir prepayment para marcar express/promo como pagados
      if (paidPrepaymentId && insertedIds[0]) {
        const { error: rpcErr } = await supabase.rpc('consume_submission_prepayment', {
          p_prepayment_id: paidPrepaymentId,
          p_submission_ids: insertedIds,
          p_campaign_id: campaignId,
        });
        if (rpcErr) {
          console.error('consume_submission_prepayment failed', rpcErr);
          toast.error('El álbum se envió pero no se pudo aplicar el pago automáticamente. Contacta soporte.');
        } else {
          toast.success(`Álbum "${info.title}" enviado a revisión con ${tracks.length} pistas.`);
          localStorage.removeItem(LS_KEY);
        }
      } else if (requiresPayment && insertedIds[0]) {
        const { data: checkout, error: chkErr } = await supabase.functions.invoke(
          'create-submission-checkout',
          { body: { submission_id: insertedIds[0], campaign_id: campaignId } },
        );
        if (chkErr || !checkout?.url) {
          toast.error('No se pudo abrir la pasarela. El álbum quedó como "pendiente de pago" — puedes reintentar desde "Mis envíos".');
        } else {
          const parts: string[] = [];
          if (expressNeedsPayment) parts.push(`Express ${expressOpt!.tier}`);
          if (promoEnabled) parts.push('Promoción');
          toast.success(`Redirigiendo a la pasarela: ${parts.join(' + ')}.`);
          onSubmitted?.();
          onOpenChange(false);
          window.location.href = checkout.url;
          return;
        }
      } else {
        toast.success(`Álbum "${info.title}" enviado a revisión con ${tracks.length} pistas.`);
      }

      setProgress(100);
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
            Paso {step} de 3 — {step === 1 ? 'Datos del álbum' : step === 2 ? 'Pistas y colaboraciones' : 'Revisión y envío'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 mb-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className={`h-1 flex-1 rounded-full ${n <= step ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Título del álbum *</Label>
              <Input value={info.title} onChange={(e) => setInfo({ ...info, title: e.target.value })} placeholder="Ej: Verano Eterno" />
            </div>
            <div>
              <Label>Artista principal *</Label>
              <Input value={info.artist_name} onChange={(e) => setInfo({ ...info, artist_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Género</Label>
                <Input value={info.genre} onChange={(e) => setInfo({ ...info, genre: e.target.value })} placeholder="Afrobeat, Pop, etc." />
              </div>
              <div>
                <Label>Fecha de lanzamiento</Label>
                <Input type="date" value={info.release_date} onChange={(e) => setInfo({ ...info, release_date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Descripción (opcional)</Label>
              <Textarea value={info.description} onChange={(e) => setInfo({ ...info, description: e.target.value })} rows={3} placeholder="Cuenta la historia del álbum…" />
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
                <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handleCover(e.target.files?.[0] ?? null)} />
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
              <Button size="sm" variant="outline" onClick={() => tracksInputRef.current?.click()} disabled={tracks.length >= MAX_TRACKS}>
                <Plus className="h-4 w-4 mr-1.5" /> Añadir pistas
              </Button>
              <input
                ref={tracksInputRef}
                type="file"
                accept="audio/mpeg,audio/mp3,audio/wav,audio/wave,audio/x-wav"
                multiple
                className="hidden"
                onChange={(e) => { handleTracksAdd(e.target.files); if (e.target) e.target.value = ''; }}
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
                {tracks.map((t, i) => {
                  const collabSum = t.collaborators.reduce((a, c) => a + (Number(c.share_percent) || 0), 0);
                  return (
                  <Card key={t.id}>
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground w-6 text-center">{i + 1}</span>
                        <Music className="h-4 w-4 text-primary flex-shrink-0" />
                        <Input value={t.title} onChange={(e) => updateTrack(i, { title: e.target.value })} placeholder="Título de la pista" className="h-8 flex-1" />
                        <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">{t.duration > 0 ? fmtDur(t.duration) : '—'}</span>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" disabled={i === 0} onClick={() => moveTrack(i, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" disabled={i === tracks.length - 1} onClick={() => moveTrack(i, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeTrack(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pl-8 gap-2 flex-wrap">
                        <p className="text-xs text-muted-foreground truncate flex-1 min-w-[120px]">{t.file?.name}</p>
                        <label className="flex items-center gap-2 text-xs">
                          <Switch checked={t.is_explicit} onCheckedChange={(v) => updateTrack(i, { is_explicit: v })} />
                          Explícita
                        </label>
                        {!t.has_collabs ? (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => enableTrackCollabs(i)}>
                            <Users className="h-3.5 w-3.5 mr-1" /> Añadir colaboración
                          </Button>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => updateTrack(i, { expanded: !t.expanded })}>
                              {t.expanded ? <ChevronUp className="h-3.5 w-3.5 mr-1" /> : <ChevronDown className="h-3.5 w-3.5 mr-1" />}
                              {t.collaborators.length} colaboradores
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => disableTrackCollabs(i)}>Quitar</Button>
                          </div>
                        )}
                      </div>

                      {/* Editor de colaboradores */}
                      {t.has_collabs && t.expanded && (
                        <div className="ml-8 mt-2 space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3">
                          <p className="text-[11px] text-muted-foreground">
                            Los splits deben sumar 100%. Si un colaborador no está aún en Yusiop, su parte se reservará hasta que se registre.
                          </p>
                          {t.collaborators.map((c, ci) => (
                            <div key={ci} className="rounded-md border border-border/40 bg-background/50 p-2 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className={`text-[10px] uppercase tracking-wider font-semibold ${c.is_primary ? 'text-primary' : 'text-muted-foreground'}`}>
                                  {c.is_primary ? 'Artista principal' : `Colaborador ${ci}`}
                                </span>
                                {!c.is_primary && (
                                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeCollab(i, ci)}>
                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                  </Button>
                                )}
                              </div>
                              <div className="grid grid-cols-12 gap-1.5">
                                <Input
                                  className="col-span-12 sm:col-span-6 h-8 text-xs"
                                  placeholder="Nombre artístico"
                                  value={c.artist_name}
                                  onChange={(e) => updateCollab(i, ci, { artist_name: e.target.value })}
                                  disabled={c.is_primary}
                                />
                                <div className="col-span-7 sm:col-span-4">
                                  {c.is_primary ? (
                                    <div className="h-8 flex items-center px-2 rounded-md border border-input bg-muted/40 text-xs text-muted-foreground">Principal</div>
                                  ) : (
                                    <Select value={c.role} onValueChange={(v) => updateCollab(i, ci, { role: v as CollabRole })}>
                                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Rol" /></SelectTrigger>
                                      <SelectContent>
                                        {COLLAB_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>
                                <div className="col-span-5 sm:col-span-2 flex items-center gap-1">
                                  <Input
                                    type="number" min={0} max={100} step={1}
                                    className="h-8 text-xs"
                                    value={c.share_percent}
                                    onChange={(e) => updateCollab(i, ci, { share_percent: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                                  />
                                  <span className="text-xs text-muted-foreground">%</span>
                                </div>
                                {!c.is_primary && (
                                  <Input
                                    type="email"
                                    className="col-span-12 h-8 text-xs"
                                    placeholder="Email del colaborador"
                                    value={c.contact_email}
                                    onChange={(e) => updateCollab(i, ci, { contact_email: e.target.value })}
                                  />
                                )}
                              </div>
                            </div>
                          ))}
                          <div className="flex items-center justify-between pt-1">
                            <span className={`text-xs font-medium ${Math.abs(collabSum - 100) < 0.01 ? 'text-emerald-500' : 'text-amber-500'}`}>
                              Total: {collabSum}%
                            </span>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => addCollab(i)}>
                              <Plus className="h-3.5 w-3.5 mr-1" /> Añadir colaborador
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  );
                })}
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
                  {coverPreview && <img src={coverPreview} alt="" className="w-24 h-24 rounded-md object-cover" />}
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

            <div className="space-y-1.5 max-h-44 overflow-y-auto">
              {tracks.map((t, i) => (
                <div key={t.id} className="flex items-center gap-2 text-sm py-1 border-b border-border/50 last:border-0">
                  <span className="font-mono text-xs text-muted-foreground w-6">{i + 1}</span>
                  <span className="flex-1 truncate">{t.title}</span>
                  {t.has_collabs && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-primary/15 text-primary rounded inline-flex items-center gap-0.5">
                      <Users className="h-3 w-3" /> {t.collaborators.length}
                    </span>
                  )}
                  {t.is_explicit && <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded">E</span>}
                  <span className="text-xs text-muted-foreground tabular-nums">{fmtDur(t.duration)}</span>
                </div>
              ))}
            </div>

            {/* Lanzamiento Express del álbum */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" /> Lanzamiento Express (todo el álbum)
                </Label>
                <button
                  type="button"
                  onClick={() => {
                    setExpressEnabled((v) => !v);
                    if (expressEnabled) { setExpressTier(null); setExpressAck(false); }
                  }}
                  className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full transition-all inline-flex items-center gap-1 ${
                    expressEnabled
                      ? 'bg-gradient-to-r from-[hsl(220,90%,55%)] via-[hsl(265,85%,60%)] to-[hsl(180,80%,50%)] text-white shadow-[0_0_18px_hsl(265_85%_60%/0.55)]'
                      : 'border border-primary/40 text-primary hover:bg-primary/10'
                  }`}
                >
                  <Zap className="h-3 w-3" />
                  {expressEnabled ? 'Express activado' : 'Activar prioridad'}
                  {isElite && !expressEnabled && <Crown className="h-3 w-3 text-[hsl(45,95%,60%)]" />}
                </button>
              </div>

              {expressEnabled && (
                <div className="relative rounded-xl p-[1px] bg-gradient-to-br from-[hsl(220,90%,55%)] via-[hsl(265,85%,60%)] to-[hsl(180,80%,50%)]">
                  <div className="rounded-[11px] bg-background p-4 space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Pago único por todo el álbum. La revisión de cada pista se realiza por separado, pero todas entran en cola prioritaria.
                    </p>
                    {!isElite && (
                      <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5 flex items-start gap-2">
                        <Lock className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <div className="text-xs flex-1 space-y-1.5">
                          <p className="font-semibold">Gratis con YUSIOP Elite</p>
                          <Button
                            type="button" size="sm"
                            onClick={() => { onOpenChange(false); navigate('/subscriptions'); }}
                            className="h-7 text-[11px] bg-gradient-to-r from-[hsl(280,85%,45%)] via-[hsl(250,95%,45%)] to-[hsl(188,85%,45%)] text-white"
                          >
                            <Crown className="h-3 w-3 mr-1" /> Mejorar a Elite
                          </Button>
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
                                ? 'border-transparent bg-gradient-to-r from-[hsl(220,90%,55%)]/15 via-[hsl(265,85%,60%)]/15 to-[hsl(180,80%,50%)]/15 ring-2 ring-[hsl(265,85%,60%)]'
                                : 'border-border bg-muted/30 hover:border-primary/40'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className={`h-9 w-9 rounded-md flex items-center justify-center text-sm font-bold ${
                                  selected ? 'bg-gradient-to-br from-[hsl(220,90%,55%)] via-[hsl(265,85%,60%)] to-[hsl(180,80%,50%)] text-white' : 'bg-muted text-foreground'
                                }`}>{opt.tier}</div>
                                <div>
                                  <div className="font-semibold text-sm">{opt.label}</div>
                                  <div className="text-[11px] text-muted-foreground">{opt.sub}</div>
                                </div>
                              </div>
                              <div className={`flex flex-col items-end leading-tight whitespace-nowrap ${selected ? 'text-primary' : 'text-foreground'}`}>
                                {isElite ? (
                                  <span className="text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-[hsl(220,90%,65%)] via-[hsl(265,85%,70%)] to-[hsl(180,80%,55%)] bg-clip-text text-transparent">Incluido</span>
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
                      <label className="flex items-start gap-2 pt-1 cursor-pointer">
                        <input type="checkbox" checked={expressAck} onChange={(e) => setExpressAck(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-border accent-primary" />
                        <span className="text-xs font-medium">He leído y acepto las condiciones del Lanzamiento Express.</span>
                      </label>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Impulsa tu lanzamiento */}
            <PromoteReleaseBlock
              value={promo}
              onChange={setPromo}
              defaultTitle={info.title || info.artist_name}
            />

            <label className="flex items-start gap-2 text-sm rounded-md border border-border p-3">
              <input type="checkbox" checked={rightsConfirmed} onChange={(e) => setRightsConfirmed(e.target.checked)} className="mt-0.5" />
              <span>Confirmo que poseo los derechos de distribución de todas las pistas de este álbum y acepto los términos de YUSIOP.</span>
            </label>

            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs flex gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <p>Cada pista será revisada individualmente. Recibirás una notificación por cada pista aprobada o rechazada.</p>
            </div>

            {submitting && <Progress value={progress} className="h-2" />}
          </div>
        )}

        <DialogFooter className="flex-row justify-between gap-2">
          <Button variant="ghost" onClick={() => step === 1 ? onOpenChange(false) : setStep(step - 1)} disabled={submitting}>
            {step === 1 ? 'Cancelar' : 'Atrás'}
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)} disabled={step === 1 ? !step1Valid : !step2Valid}>
              Continuar
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {submitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando…</>) : (<><Upload className="h-4 w-4 mr-2" /> Enviar álbum a revisión</>)}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SubmitAlbumDialog;
