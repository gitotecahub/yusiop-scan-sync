import { useEffect, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ShieldCheck, Check, X, ShieldAlert, FileText, ExternalLink, Pause } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VerifReq {
  id: string;
  artist_profile_id: string;
  user_id: string;
  stage_name: string | null;
  legal_name: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  official_links: string[];
  id_document_url: string | null;
  selfie_url: string | null;
  status: string;
  admin_note: string | null;
  rejection_reason: string | null;
  created_at: string;
}
interface Claim {
  id: string;
  claimant_user_id: string;
  claimant_artist_code: string;
  claimant_stage_name: string;
  song_id: string | null;
  song_title_snapshot: string | null;
  target_artist_id: string | null;
  participation_type: string;
  claimed_percent: number | null;
  proof_links: string[];
  document_url: string | null;
  comment: string | null;
  status: string;
  admin_note: string | null;
  rejection_reason: string | null;
  risk_flags: string[];
  risk_score: number;
  created_at: string;
}

const useSignedUrl = (path: string | null) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) return;
    supabase.storage.from('artist-verification').createSignedUrl(path, 600).then(r => setUrl(r.data?.signedUrl ?? null));
  }, [path]);
  return url;
};

const DocLink = ({ path, label }: { path: string | null; label: string }) => {
  const url = useSignedUrl(path);
  if (!path) return <span className="text-xs text-muted-foreground">{label}: —</span>;
  return (
    <a href={url ?? '#'} target="_blank" rel="noreferrer" className="text-xs underline text-primary inline-flex items-center gap-1">
      <FileText className="h-3 w-3" /> {label}
    </a>
  );
};

const Verifications = () => {
  const [verifs, setVerifs] = useState<VerifReq[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [filter, setFilter] = useState<string>('under_review');
  const [claimFilter, setClaimFilter] = useState<string>('pending,under_review');
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteAction, setNoteAction] = useState<{ type: 'verif' | 'claim'; id: string; newStatus: string } | null>(null);

  const loadVerifs = async () => {
    let q = (supabase as any).from('artist_verification_requests').select('*').order('created_at', { ascending: false });
    if (filter !== 'all') q = q.eq('status', filter);
    const { data } = await q;
    setVerifs(((data ?? []) as any[]).map(v => ({ ...v, official_links: v.official_links || [] })));
  };
  const loadClaims = async () => {
    let q = (supabase as any).from('collaboration_claims_v2').select('*').order('created_at', { ascending: false });
    if (claimFilter !== 'all') q = q.in('status', claimFilter.split(','));
    const { data } = await q;
    setClaims(((data ?? []) as any[]).map(c => ({ ...c, proof_links: c.proof_links || [], risk_flags: c.risk_flags || [] })));
  };

  useEffect(() => { loadVerifs(); }, [filter]);
  useEffect(() => { loadClaims(); }, [claimFilter]);

  const resolveVerif = async (v: VerifReq, status: 'artist_verified' | 'rejected') => {
    const note = noteText.trim() || null;
    const upd = { status, reviewed_at: new Date().toISOString(), admin_note: note, rejection_reason: status === 'rejected' ? note : null };
    const { error } = await (supabase as any).from('artist_verification_requests').update(upd).eq('id', v.id);
    if (error) return toast.error(error.message);
    const { error: e2 } = await (supabase as any).from('artist_profiles').update({
      verification_status: status,
      verified_at: status === 'artist_verified' ? new Date().toISOString() : null,
      rejection_reason: status === 'rejected' ? note : null,
    }).eq('id', v.artist_profile_id);
    if (e2) return toast.error(e2.message);
    await supabase.from('notifications').insert({
      user_id: v.user_id,
      type: status === 'artist_verified' ? 'verification_approved' : 'verification_rejected',
      title: status === 'artist_verified' ? 'Verificación aprobada' : 'Verificación rechazada',
      body: note ?? '',
    });
    toast.success('Actualizado');
    setNoteOpen(false); setNoteText('');
    loadVerifs();
  };

  const resolveClaim = async (c: Claim, newStatus: 'approved' | 'rejected' | 'blocked' | 'disputed') => {
    const note = noteText.trim() || null;
    const { error } = await (supabase as any).from('collaboration_claims_v2').update({
      status: newStatus,
      reviewed_at: new Date().toISOString(),
      admin_note: note,
      rejection_reason: newStatus === 'rejected' ? note : null,
    }).eq('id', c.id);
    if (error) return toast.error(error.message);

    // Si se aprueba una reclamación de artista completo: linkear perfil + liberar pool
    if (newStatus === 'approved' && c.participation_type === 'artist_ownership' && c.target_artist_id) {
      const { data: ap } = await (supabase as any)
        .from('artist_profiles').select('id').eq('user_id', c.claimant_user_id).maybeSingle();
      if (ap?.id) {
        const { error: linkErr } = await (supabase as any).rpc('link_verified_artist_profile', {
          p_profile_id: ap.id, p_artist_id: c.target_artist_id,
        });
        if (linkErr) toast.error('Link fallido: ' + linkErr.message);
        else {
          const { error: relErr } = await (supabase as any).rpc('release_artist_pool_hold', { p_artist_id: c.target_artist_id });
          if (relErr) toast.error('Liberación fallida: ' + relErr.message);
          else toast.success('Perfil vinculado y pool liberado');
        }
      }
    }

    supabase.functions.invoke('send-claim-status-email', { body: { claimId: c.id } })
      .catch((e) => console.error('[claim email]', e));

    toast.success('Actualizado');
    setNoteOpen(false); setNoteText('');
    loadClaims();
  };

  const openWithNote = (action: typeof noteAction) => { setNoteAction(action); setNoteText(''); setNoteOpen(true); };

  const confirmNote = () => {
    if (!noteAction) return;
    if (noteAction.type === 'verif') {
      const v = verifs.find(x => x.id === noteAction.id);
      if (v) resolveVerif(v, noteAction.newStatus as any);
    } else {
      const c = claims.find(x => x.id === noteAction.id);
      if (c) resolveClaim(c, noteAction.newStatus as any);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-6 w-6" /> Verificación y reclamaciones
        </h1>
      </div>

      <Tabs defaultValue="verifs">
        <TabsList>
          <TabsTrigger value="verifs">Artistas</TabsTrigger>
          <TabsTrigger value="claims">Reclamaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="verifs" className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {['under_review', 'approved', 'rejected', 'all'].map(f => (
              <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)}>{f}</Button>
            ))}
          </div>
          {verifs.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground">Sin solicitudes</CardContent></Card>
          ) : verifs.map(v => (
            <Card key={v.id}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                  {v.stage_name} <Badge variant="outline">{v.status}</Badge>
                  <span className="text-xs text-muted-foreground font-normal">{new Date(v.created_at).toLocaleString()}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>{v.legal_name} · {v.country} · {v.phone} · {v.email}</p>
                <div className="flex gap-3 flex-wrap">
                  <DocLink path={v.id_document_url} label="Documento" />
                  <DocLink path={v.selfie_url} label="Selfie" />
                </div>
                {v.official_links.length > 0 && (
                  <ul className="text-xs space-y-0.5">
                    {v.official_links.map((l, i) => (
                      <li key={i}><a href={l} target="_blank" rel="noreferrer" className="text-primary underline inline-flex items-center gap-1"><ExternalLink className="h-3 w-3" />{l}</a></li>
                    ))}
                  </ul>
                )}
                {v.status === 'under_review' && (
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" onClick={() => openWithNote({ type: 'verif', id: v.id, newStatus: 'artist_verified' })}>
                      <Check className="h-4 w-4 mr-1" /> Aprobar
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => openWithNote({ type: 'verif', id: v.id, newStatus: 'rejected' })}>
                      <X className="h-4 w-4 mr-1" /> Rechazar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="claims" className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {[
              { v: 'pending,under_review', l: 'Activas' },
              { v: 'approved', l: 'Aprobadas' },
              { v: 'rejected', l: 'Rechazadas' },
              { v: 'disputed', l: 'Disputadas' },
              { v: 'blocked', l: 'Bloqueadas' },
              { v: 'all', l: 'Todas' },
            ].map(f => (
              <Button key={f.v} size="sm" variant={claimFilter === f.v ? 'default' : 'outline'} onClick={() => setClaimFilter(f.v)}>{f.l}</Button>
            ))}
          </div>
          {claims.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground">Sin reclamaciones</CardContent></Card>
          ) : claims.map(c => (
            <Card key={c.id}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                  {c.song_title_snapshot ?? '—'} <Badge variant="outline">{c.status}</Badge>
                  <Badge variant="secondary">{c.participation_type}</Badge>
                  {c.claimed_percent != null && <Badge variant="secondary">{c.claimed_percent}%</Badge>}
                  {c.risk_score > 0 && <Badge variant="destructive">Riesgo {c.risk_score}</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>Reclama: <strong>{c.claimant_stage_name}</strong> <span className="font-mono text-xs">{c.claimant_artist_code}</span></p>
                {c.comment && <p className="text-muted-foreground italic">"{c.comment}"</p>}
                {c.proof_links.length > 0 && (
                  <ul className="text-xs space-y-0.5">
                    {c.proof_links.map((l, i) => (
                      <li key={i}><a href={l} target="_blank" rel="noreferrer" className="text-primary underline">{l}</a></li>
                    ))}
                  </ul>
                )}
                {c.document_url && <DocLink path={c.document_url} label="Documento" />}
                {c.risk_flags.length > 0 && (
                  <p className="text-xs text-destructive">⚠ {c.risk_flags.join(', ')}</p>
                )}
                {['pending', 'under_review', 'disputed'].includes(c.status) && (
                  <div className="flex gap-2 pt-2 flex-wrap">
                    <Button size="sm" onClick={() => openWithNote({ type: 'claim', id: c.id, newStatus: 'approved' })}>
                      <Check className="h-4 w-4 mr-1" /> Aprobar
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => openWithNote({ type: 'claim', id: c.id, newStatus: 'rejected' })}>
                      <X className="h-4 w-4 mr-1" /> Rechazar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openWithNote({ type: 'claim', id: c.id, newStatus: 'disputed' })}>
                      <ShieldAlert className="h-4 w-4 mr-1" /> Disputada
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openWithNote({ type: 'claim', id: c.id, newStatus: 'blocked' })}>
                      <Pause className="h-4 w-4 mr-1" /> Bloquear
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nota / motivo</DialogTitle></DialogHeader>
          <Textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={4} maxLength={500}
            placeholder="Opcional: motivo o nota interna" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNoteOpen(false)}>Cancelar</Button>
            <Button onClick={confirmNote}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Verifications;
