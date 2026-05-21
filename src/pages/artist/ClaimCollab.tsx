import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, X, Send, Clock, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useArtistProfile } from '@/hooks/useArtistProfile';

type Participation = 'singer' | 'composer' | 'producer' | 'beatmaker' | 'featuring' | 'label' | 'artist_ownership' | 'other';

const TYPE_LABEL: Record<Participation, string> = {
  singer: 'Cantante', composer: 'Compositor', producer: 'Productor',
  beatmaker: 'Beatmaker', featuring: 'Featuring', label: 'Sello',
  artist_ownership: 'Soy el artista', other: 'Otro',
};

const STATUS_BADGE: Record<string, { label: string; icon: any; variant: any }> = {
  pending: { label: 'Pendiente', icon: Clock, variant: 'secondary' },
  under_review: { label: 'En revisión', icon: Clock, variant: 'secondary' },
  approved: { label: 'Aprobada', icon: CheckCircle2, variant: 'default' },
  rejected: { label: 'Rechazada', icon: AlertCircle, variant: 'destructive' },
  disputed: { label: 'Disputada', icon: ShieldAlert, variant: 'destructive' },
  blocked: { label: 'Bloqueada', icon: ShieldAlert, variant: 'destructive' },
};

interface Claim {
  id: string;
  song_title_snapshot: string | null;
  participation_type: Participation;
  status: string;
  rejection_reason: string | null;
  created_at: string;
}

const ClaimCollab = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuthStore();
  const { profile } = useArtistProfile();

  const ownershipArtistId = params.get('artistId');
  const ownershipArtistName = params.get('name');
  const isOwnershipMode = !!ownershipArtistId;

  const [songSearch, setSongSearch] = useState('');
  const [songs, setSongs] = useState<{ id: string; title: string; artist_id: string }[]>([]);
  const [selectedSong, setSelectedSong] = useState<{ id: string; title: string } | null>(null);
  const [type, setType] = useState<Participation>(isOwnershipMode ? 'artist_ownership' : 'featuring');
  const [percent, setPercent] = useState<string>('');
  const [links, setLinks] = useState<string[]>(['']);
  const [comment, setComment] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mine, setMine] = useState<Claim[]>([]);
  const [poolAmount, setPoolAmount] = useState<number | null>(null);

  const loadMine = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from('collaboration_claims_v2')
      .select('id,song_title_snapshot,participation_type,status,rejection_reason,created_at')
      .eq('claimant_user_id', user.id)
      .order('created_at', { ascending: false });
    setMine((data ?? []) as Claim[]);
  };

  useEffect(() => { loadMine(); }, [user?.id]);

  useEffect(() => {
    if (songSearch.length < 2) { setSongs([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('songs')
        .select('id,title,artist_id')
        .ilike('title', `%${songSearch}%`)
        .limit(8);
      setSongs(data ?? []);
    }, 300);
    return () => clearTimeout(t);
  }, [songSearch]);

  const submit = async () => {
    if (!profile || !user) return toast.error('Necesitas un perfil de artista');
    if (!selectedSong) return toast.error('Selecciona una canción');
    const validLinks = links.map(l => l.trim()).filter(Boolean);
    setSubmitting(true);
    try {
      let docPath: string | null = null;
      if (docFile) {
        const ext = docFile.name.split('.').pop();
        const p = `${user.id}/claim-${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('artist-verification').upload(p, docFile);
        if (error) throw error;
        docPath = p;
      }
      const { data: inserted, error } = await (supabase as any).from('collaboration_claims_v2').insert({
        claimant_user_id: user.id,
        claimant_artist_code: profile.artist_code,
        claimant_stage_name: profile.stage_name,
        song_id: selectedSong.id,
        song_title_snapshot: selectedSong.title,
        participation_type: type,
        claimed_percent: percent ? Number(percent) : null,
        proof_links: validLinks,
        document_url: docPath,
        comment: comment.trim() || null,
      }).select('id').single();
      if (error) throw error;

      // Email de confirmación al claimant
      if (user.email && inserted?.id) {
        supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'claim-submitted',
            recipientEmail: user.email,
            idempotencyKey: `claim-submitted-${inserted.id}`,
            templateData: {
              artistName: profile.stage_name,
              songTitle: selectedSong.title,
              participationType: type,
            },
          },
        }).catch((e) => console.error('[claim email]', e));
      }

      toast.success('Reclamación enviada');
      setSelectedSong(null); setSongSearch(''); setPercent(''); setLinks(['']); setComment(''); setDocFile(null);
      loadMine();
    } catch (e: any) {
      toast.error(e.message ?? 'Error enviando reclamación');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto pb-24">
      <Button variant="ghost" onClick={() => navigate('/artist')} className="-ml-3 mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" /> Volver
      </Button>

      <div className="blob-card p-6 mb-6">
        <p className="eyebrow mb-1">Colaboraciones</p>
        <h1 className="display-xl text-3xl">Reclamar colaboración</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Reclama tu participación en una canción. Tu ID:{' '}
          <span className="font-mono font-semibold">{profile?.artist_code ?? '—'}</span>
        </p>
      </div>

      <Card className="mb-6">
        <CardContent className="p-6 space-y-4">
          <div>
            <Label>Buscar canción *</Label>
            <Input value={songSearch} onChange={e => { setSongSearch(e.target.value); setSelectedSong(null); }} placeholder="Título de la canción" />
            {songs.length > 0 && !selectedSong && (
              <div className="border rounded mt-1 max-h-48 overflow-auto">
                {songs.map(s => (
                  <button key={s.id} type="button"
                    className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                    onClick={() => { setSelectedSong(s); setSongSearch(s.title); setSongs([]); }}>
                    {s.title}
                  </button>
                ))}
              </div>
            )}
            {selectedSong && <p className="text-xs text-primary mt-1">Seleccionada: {selectedSong.title}</p>}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Tipo de participación *</Label>
              <Select value={type} onValueChange={(v) => setType(v as Participation)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABEL).map(([k, l]) => (
                    <SelectItem key={k} value={k}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>% reclamado (opcional)</Label>
              <Input type="number" min={0} max={100} value={percent} onChange={e => setPercent(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Links de prueba</Label>
            <div className="space-y-2 mt-2">
              {links.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={l} onChange={e => setLinks(links.map((x, j) => j === i ? e.target.value : x))} placeholder="https://..." />
                  {links.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => setLinks(links.filter((_, j) => j !== i))}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setLinks([...links, ''])}>
                <Plus className="h-4 w-4 mr-1" /> Añadir
              </Button>
            </div>
          </div>

          <div>
            <Label>Documento o contrato (opcional)</Label>
            <Input type="file" accept="image/*,application/pdf" onChange={e => setDocFile(e.target.files?.[0] ?? null)} />
          </div>

          <div>
            <Label>Comentario</Label>
            <Textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} maxLength={500} />
          </div>

          <Button onClick={submit} disabled={submitting || !selectedSong} className="w-full">
            <Send className="h-4 w-4 mr-2" /> {submitting ? 'Enviando…' : 'Enviar reclamación'}
          </Button>
        </CardContent>
      </Card>

      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Mis reclamaciones</h2>
      {mine.length === 0 ? (
        <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">No has enviado reclamaciones aún.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {mine.map(c => {
            const b = STATUS_BADGE[c.status] ?? STATUS_BADGE.pending;
            const Icon = b.icon;
            return (
              <Card key={c.id}>
                <CardContent className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{c.song_title_snapshot ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">{TYPE_LABEL[c.participation_type]} · {new Date(c.created_at).toLocaleDateString()}</p>
                    {c.rejection_reason && <p className="text-xs text-destructive mt-1">{c.rejection_reason}</p>}
                  </div>
                  <Badge variant={b.variant}><Icon className="h-3 w-3 mr-1" />{b.label}</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ClaimCollab;
