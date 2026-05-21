import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useArtistProfile } from '@/hooks/useArtistProfile';
import { ArtistPoolMatch } from '@/components/artist/ArtistPoolMatch';

const ArtistVerification = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { profile, reload } = useArtistProfile();

  const [legalName, setLegalName] = useState('');
  const [stageName, setStageName] = useState('');
  const [country, setCountry] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [links, setLinks] = useState<string[]>(['']);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile) {
      setStageName(profile.stage_name);
      setLegalName(profile.legal_name ?? '');
      setCountry(profile.country ?? '');
      setPhone(profile.phone ?? '');
      setLinks(profile.official_links?.length ? profile.official_links : ['']);
    }
    if (user?.email) setEmail(user.email);
  }, [profile, user]);

  const upload = async (file: File, kind: string) => {
    const ext = file.name.split('.').pop();
    const path = `${user!.id}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('artist-verification').upload(path, file, { upsert: true });
    if (error) throw error;
    return path;
  };

  const submit = async () => {
    if (!profile || !user) return;
    if (!legalName.trim() || !stageName.trim() || !country.trim() || !phone.trim()) {
      toast.error('Completa todos los datos personales');
      return;
    }
    const validLinks = links.map(l => l.trim()).filter(Boolean);
    if (validLinks.length === 0) {
      toast.error('Añade al menos un link oficial (YouTube, Spotify, IG…)');
      return;
    }
    if (!docFile || !selfieFile) {
      toast.error('Sube tu documento y selfie');
      return;
    }
    setSubmitting(true);
    try {
      const [docPath, selfiePath] = await Promise.all([
        upload(docFile, 'id'),
        upload(selfieFile, 'selfie'),
      ]);

      await (supabase as any).from('artist_profiles').update({
        legal_name: legalName, stage_name: stageName, country, phone,
        official_links: validLinks,
        verification_status: 'under_review',
      }).eq('id', profile.id);

      const { error } = await (supabase as any).from('artist_verification_requests').insert({
        artist_profile_id: profile.id,
        user_id: user.id,
        id_document_url: docPath,
        selfie_url: selfiePath,
        official_links: validLinks,
        country, stage_name: stageName, legal_name: legalName, phone, email,
        status: 'under_review',
      });
      if (error) throw error;

      toast.success('Solicitud enviada. Te avisaremos cuando se revise.');
      await reload();
      navigate('/artist');
    } catch (e: any) {
      toast.error(e.message ?? 'Error enviando verificación');
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
        <p className="eyebrow mb-1">Verificación de artista</p>
        <h1 className="display-xl text-3xl">Verifica tu identidad</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Necesitas estar verificado para cobrar ganancias y reclamar colaboraciones.
          Tu ID de artista es <span className="font-mono font-semibold">{profile?.artist_code}</span>.
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Nombre artístico *</Label>
              <Input value={stageName} onChange={e => setStageName(e.target.value)} />
            </div>
            <div>
              <Label>Nombre legal *</Label>
              <Input value={legalName} onChange={e => setLegalName(e.target.value)} />
            </div>
            <div>
              <Label>País *</Label>
              <Input value={country} onChange={e => setCountry(e.target.value)} placeholder="Ej: ES" />
            </div>
            <div>
              <Label>Teléfono *</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Email</Label>
              <Input value={email} disabled />
          </div>

          <ArtistPoolMatch stageName={stageName} />

          </div>

          <div>
            <Label>Links oficiales * (YouTube, Spotify, IG, TikTok…)</Label>
            <div className="space-y-2 mt-2">
              {links.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={l}
                    onChange={e => setLinks(links.map((x, j) => j === i ? e.target.value : x))}
                    placeholder="https://..."
                  />
                  {links.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => setLinks(links.filter((_, j) => j !== i))}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setLinks([...links, ''])}>
                <Plus className="h-4 w-4 mr-1" /> Añadir link
              </Button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Documento de identidad *</Label>
              <Input type="file" accept="image/*,application/pdf" onChange={e => setDocFile(e.target.files?.[0] ?? null)} />
            </div>
            <div>
              <Label>Selfie de verificación *</Label>
              <Input type="file" accept="image/*" onChange={e => setSelfieFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>

          <Button onClick={submit} disabled={submitting} className="w-full">
            <Upload className="h-4 w-4 mr-2" />
            {submitting ? 'Enviando…' : 'Enviar verificación'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ArtistVerification;
