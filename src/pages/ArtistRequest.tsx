import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Upload, FileText, X, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useModeStore } from '@/stores/modeStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const schema = z.object({
  artist_name: z.string().trim().min(2, 'Nombre demasiado corto').max(80),
  contact_email: z.string().trim().email('Email inválido').max(255),
  links: z.string().trim().max(500).optional().or(z.literal('')),
});

interface UploadedDoc {
  path: string;
  name: string;
}

const ArtistRequest = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { artistRequestStatus, isArtist, loadForUser } = useModeStore();

  const [artistName, setArtistName] = useState('');
  const [bio, setBio] = useState('');
  const [genre, setGenre] = useState('');
  const [contactEmail, setContactEmail] = useState(user?.email ?? '');
  const [links, setLinks] = useState('');
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [existingRequest, setExistingRequest] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('artist_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setExistingRequest(data);
    };
    load();
  }, [user]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Máximo 10 MB por archivo');
      return;
    }
    if (docs.length >= 5) {
      toast.error('Máximo 5 documentos');
      return;
    }
    try {
      setUploading(true);
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage
        .from('artist-documents')
        .upload(path, file, { contentType: file.type });
      if (error) throw error;
      setDocs((prev) => [...prev, { path, name: file.name }]);
      toast.success('Documento subido');
    } catch (err: any) {
      console.error(err);
      toast.error('Error al subir el documento');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeDoc = async (doc: UploadedDoc) => {
    try {
      await supabase.storage.from('artist-documents').remove([doc.path]);
      setDocs((prev) => prev.filter((d) => d.path !== doc.path));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    const parsed = schema.safeParse({
      artist_name: artistName,
      bio,
      genre,
      contact_email: contactEmail,
      links,
    });
    if (!parsed.success) {
      const issues = (parsed.error as any).issues ?? (parsed.error as any).errors ?? [];
      toast.error(issues[0]?.message ?? 'Datos inválidos');
      return;
    }
    if (docs.length === 0) {
      toast.error('Sube al menos un documento de verificación');
      return;
    }

    try {
      setSubmitting(true);
      const linkArray = links
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);

      const { error } = await supabase.from('artist_requests').insert([{
        user_id: user.id,
        artist_name: parsed.data.artist_name,
        bio: parsed.data.bio || null,
        genre: parsed.data.genre || null,
        contact_email: parsed.data.contact_email,
        links: linkArray as any,
        document_urls: docs as any,
      }]);
      if (error) throw error;

      await loadForUser(user.id);
      toast.success('Solicitud enviada. Te avisaremos cuando sea revisada.');
      navigate('/profile', { replace: true });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message ?? 'Error al enviar la solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  // Si ya es artista
  if (isArtist) {
    return (
      <div className="min-h-screen p-6 max-w-2xl mx-auto">
        <div className="blob-card p-6 text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
          <h2 className="font-display text-2xl font-bold">Ya eres artista en Yusiop</h2>
          <Button onClick={() => navigate('/artist')} className="rounded-full vapor-bg">
            Ir al panel de artista
          </Button>
        </div>
      </div>
    );
  }

  // Si tiene una solicitud pendiente o rechazada
  if (existingRequest && existingRequest.status === 'pending') {
    return (
      <div className="min-h-screen p-6 max-w-2xl mx-auto">
        <div className="blob-card p-6 text-center space-y-4">
          <Clock className="h-12 w-12 text-primary mx-auto animate-pulse" />
          <h2 className="font-display text-2xl font-bold">Solicitud en revisión</h2>
          <p className="text-sm text-muted-foreground">
            Hemos recibido tu solicitud como <strong>{existingRequest.artist_name}</strong>. Te avisaremos cuando sea revisada.
          </p>
          <Badge>Estado: pendiente</Badge>
          <div>
            <Button variant="ghost" onClick={() => navigate('/')}>Volver</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto pb-24">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 -ml-3">
        <ArrowLeft className="h-4 w-4 mr-2" /> Volver
      </Button>

      <h1 className="display-xl text-3xl mb-2">Solicitar perfil de artista</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Completa la información y sube documentos que acrediten tu identidad como artista (DNI, contratos, ficha de sello, prensa…). La administración revisará tu solicitud.
      </p>

      {existingRequest?.status === 'rejected' && (
        <div className="blob-card p-4 mb-6 border-destructive/40">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Tu última solicitud fue rechazada</p>
              {existingRequest.rejection_reason && (
                <p className="text-xs text-muted-foreground mt-1">
                  Motivo: {existingRequest.rejection_reason}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2">Puedes enviar una nueva solicitud abajo.</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <Label className="eyebrow">Nombre artístico *</Label>
          <Input
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
            maxLength={80}
            className="rounded-2xl h-11 mt-2"
            placeholder="Tu nombre o el de tu proyecto"
          />
        </div>

        <div>
          <Label className="eyebrow">Género musical</Label>
          <Input
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            maxLength={60}
            className="rounded-2xl h-11 mt-2"
            placeholder="Indie, electrónica, hip-hop…"
          />
        </div>

        <div>
          <Label className="eyebrow">Biografía</Label>
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={800}
            rows={4}
            className="rounded-2xl mt-2"
            placeholder="Cuéntanos sobre tu proyecto…"
          />
          <p className="text-xs text-muted-foreground mt-1">{bio.length}/800</p>
        </div>

        <div>
          <Label className="eyebrow">Email de contacto *</Label>
          <Input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            maxLength={255}
            className="rounded-2xl h-11 mt-2"
          />
        </div>

        <div>
          <Label className="eyebrow">Enlaces (Spotify, Instagram, web…)</Label>
          <Textarea
            value={links}
            onChange={(e) => setLinks(e.target.value)}
            maxLength={500}
            rows={2}
            className="rounded-2xl mt-2"
            placeholder="Uno por línea o separados por coma"
          />
        </div>

        <div>
          <Label className="eyebrow">Documentos de verificación *</Label>
          <p className="text-xs text-muted-foreground mt-1 mb-2">
            PDF o imágenes. Máximo 5 archivos, 10 MB cada uno.
          </p>

          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFile}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || docs.length >= 5}
            className="w-full rounded-2xl h-11"
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? 'Subiendo…' : 'Añadir documento'}
          </Button>

          {docs.length > 0 && (
            <div className="space-y-2 mt-3">
              {docs.map((doc) => (
                <div key={doc.path} className="flex items-center gap-2 p-2 rounded-xl bg-muted">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm truncate flex-1">{doc.name}</span>
                  <Button size="sm" variant="ghost" onClick={() => removeDoc(doc)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full rounded-full vapor-bg text-primary-foreground h-12 font-bold shadow-glow"
        >
          {submitting ? 'Enviando…' : 'Enviar solicitud'}
        </Button>
      </div>
    </div>
  );
};

export default ArtistRequest;
