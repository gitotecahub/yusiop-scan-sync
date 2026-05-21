import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useArtistProfile } from '@/hooks/useArtistProfile';

const STATUS_LABEL: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  unverified: { label: 'Sin verificar', variant: 'outline' },
  basic_verified: { label: 'Básico verificado', variant: 'secondary' },
  artist_verified: { label: 'Artista verificado', variant: 'default' },
  under_review: { label: 'En revisión', variant: 'secondary' },
  rejected: { label: 'Rechazado', variant: 'destructive' },
  suspended: { label: 'Suspendido', variant: 'destructive' },
};

const ArtistVerificationCard = () => {
  const { profile, loading } = useArtistProfile();
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  if (loading || !profile) return null;

  const status = STATUS_LABEL[profile.verification_status] ?? STATUS_LABEL.unverified;
  const canSubmit = ['unverified', 'basic_verified', 'rejected'].includes(profile.verification_status);

  const copy = async () => {
    await navigator.clipboard.writeText(profile.artist_code);
    setCopied(true);
    toast.success('ID copiado');
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Card className="mb-4 border-primary/20">
      <CardContent className="p-4 flex items-center gap-3 flex-wrap">
        <ShieldCheck className="h-8 w-8 text-primary shrink-0" />
        <div className="flex-1 min-w-[180px]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-semibold">{profile.artist_code}</span>
            <button onClick={copy} className="text-muted-foreground hover:text-foreground" aria-label="Copiar ID">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            @{profile.artist_username} · {profile.verification_status === 'artist_verified'
              ? 'Puedes cobrar y reclamar colaboraciones.'
              : 'Verifica tu identidad para cobrar tus ganancias.'}
          </p>
          {profile.verification_status === 'rejected' && profile.rejection_reason && (
            <p className="text-xs text-destructive mt-1">Motivo: {profile.rejection_reason}</p>
          )}
        </div>
        <div className="flex gap-2">
          {canSubmit && (
            <Button size="sm" onClick={() => navigate('/artist/verification')}>
              {profile.verification_status === 'rejected' ? 'Reintentar' : 'Verificar'}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => navigate('/artist/claim-collab')}>
            Reclamar colab.
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ArtistVerificationCard;
