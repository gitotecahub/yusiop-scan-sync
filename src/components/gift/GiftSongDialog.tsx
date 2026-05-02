import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gift, Mail, Users, Loader2, Wallet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useFriends } from '@/hooks/useFriends';
import { useWallet } from '@/hooks/useWallet';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface GiftSongDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  songId: string;
  songTitle: string;
  artistName: string;
}

type Recipient =
  | { kind: 'user'; user_id: string; label: string; avatar?: string | null; sublabel?: string }
  | { kind: 'email'; email: string };

const GiftSongDialog = ({ open, onOpenChange, songId, songTitle, artistName }: GiftSongDialogProps) => {
  const { friends } = useFriends();
  const { wallet, refresh: refreshWallet } = useWallet();
  const navigate = useNavigate();

  const [tab, setTab] = useState<'friends' | 'email'>('friends');
  const [search, setSearch] = useState('');
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);
  const [success, setSuccess] = useState<{ status: string; message: string } | null>(null);

  const price = wallet?.value_per_download_xaf ?? 250;
  const balance = wallet?.balance ?? 0;
  const remaining = balance - price;
  const insufficient = balance < price;

  useEffect(() => {
    if (!open) {
      setRecipient(null);
      setEmailInput('');
      setMessage('');
      setSearch('');
      setConfirmStep(false);
      setSuccess(null);
      setTab('friends');
    }
  }, [open]);

  const filteredFriends = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter(
      (f) =>
        (f.full_name || '').toLowerCase().includes(q) ||
        (f.username || '').toLowerCase().includes(q),
    );
  }, [friends, search]);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  const handlePickFriend = (f: { user_id: string; full_name?: string | null; username?: string | null; avatar_url?: string | null }) => {
    setRecipient({
      kind: 'user',
      user_id: f.user_id,
      label: f.full_name || f.username || 'Usuario',
      sublabel: f.username ? `@${f.username}` : undefined,
      avatar: f.avatar_url || null,
    });
    setConfirmStep(true);
  };

  const handlePickEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (!isValidEmail(email)) {
      toast.error('Email inválido');
      return;
    }
    setRecipient({ kind: 'email', email });
    setConfirmStep(true);
  };

  const handleConfirm = async () => {
    if (!recipient || sending) return;

    // Validación frontend (también validado en backend)
    if (recipient.kind === 'user' && insufficient) {
      toast.error('Saldo insuficiente');
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.rpc('gift_song', {
        p_song_id: songId,
        p_recipient_user_id: recipient.kind === 'user' ? recipient.user_id : null,
        p_recipient_email: recipient.kind === 'email' ? recipient.email : null,
        p_message: message.trim() || null,
      });

      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.success) {
        toast.error(row?.message || 'No se pudo procesar el regalo');
        setSending(false);
        return;
      }

      // Si es email pendiente, enviar email de invitación
      if (row.status === 'pending_signup' && recipient.kind === 'email') {
        try {
          await supabase.functions.invoke('send-song-gift-email', {
            body: {
              giftId: row.gift_id,
              recipientEmail: recipient.email,
              songTitle,
              artistName,
              message: message.trim() || null,
            },
          });
        } catch (e) {
          console.warn('No se pudo enviar email de invitación:', e);
        }
      }

      await refreshWallet();
      setSuccess({
        status: row.status,
        message:
          row.status === 'completed'
            ? `¡Regalo enviado! Se han descontado ${price} XAF.`
            : 'Invitación enviada. El regalo se entregará cuando el destinatario se registre.',
      });
    } catch (e: any) {
      toast.error(e.message || 'Error al enviar el regalo');
    } finally {
      setSending(false);
    }
  };

  // ============ Vista éxito ============
  if (success) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <div className="py-8 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center">
              <CheckCircle2 className="h-9 w-9 text-primary" />
            </div>
            <h3 className="font-display text-xl font-bold">
              {success.status === 'completed' ? '🎁 Regalo enviado' : '📧 Invitación enviada'}
            </h3>
            <p className="text-sm text-muted-foreground">{success.message}</p>
            <Button
              onClick={() => onOpenChange(false)}
              className="rounded-full bg-gradient-to-r from-yusiop-primary via-yusiop-accent to-yusiop-secondary"
            >
              Listo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ============ Vista confirmación ============
  if (confirmStep && recipient) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Confirmar regalo
            </DialogTitle>
            <DialogDescription>
              Vas a regalar la canción "{songTitle}".
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="rounded-xl border border-border p-3 space-y-2 text-sm">
              <Row label="Canción" value={songTitle} />
              <Row label="Artista" value={artistName} />
              <Row
                label="Destinatario"
                value={recipient.kind === 'user' ? recipient.label : recipient.email}
              />
              <Row label="Coste" value={`${price.toLocaleString()} XAF`} highlight />
              <Row label="Tu saldo" value={`${balance.toLocaleString()} XAF`} />
              {recipient.kind === 'user' && (
                <Row
                  label="Saldo restante"
                  value={`${remaining.toLocaleString()} XAF`}
                  danger={insufficient}
                />
              )}
            </div>

            {recipient.kind === 'user' && insufficient && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  No tienes créditos suficientes para regalar esta canción.
                </div>
              </div>
            )}

            {recipient.kind === 'email' && (
              <div className="rounded-lg bg-primary/10 border border-primary/30 p-3 text-xs">
                Este email no está registrado. Recibirá una invitación y, al
                registrarse, se le entregará la canción y se descontará tu saldo en ese momento.
              </div>
            )}

            <Textarea
              placeholder="Mensaje personalizado (opcional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={250}
              rows={2}
              className="resize-none"
            />

            <p className="text-[11px] text-muted-foreground leading-snug">
              {recipient.kind === 'user'
                ? `Esta acción descontará ${price} XAF de tu saldo. La canción permanecerá en tu biblioteca y el destinatario recibirá la descarga en la suya.`
                : 'No se descontará nada hasta que el destinatario se registre y canjee el regalo.'}
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmStep(false)}
              disabled={sending}
              className="rounded-full"
            >
              Cancelar
            </Button>
            {recipient.kind === 'user' && insufficient ? (
              <Button
                onClick={() => {
                  onOpenChange(false);
                  navigate('/wallet');
                }}
                className="rounded-full"
              >
                <Wallet className="h-4 w-4 mr-1.5" />
                Recargar saldo
              </Button>
            ) : (
              <Button
                onClick={handleConfirm}
                disabled={sending}
                className="rounded-full bg-gradient-to-r from-yusiop-primary via-yusiop-accent to-yusiop-secondary"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Enviando regalo...
                  </>
                ) : (
                  <>
                    <Gift className="h-4 w-4 mr-1.5" />
                    Confirmar regalo
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ============ Vista selección destinatario ============
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Regalar canción
          </DialogTitle>
          <DialogDescription>
            "{songTitle}" — {artistName}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'friends' | 'email')}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="friends">
              <Users className="h-3.5 w-3.5 mr-1.5" />
              Amigos
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="h-3.5 w-3.5 mr-1.5" />
              Por email
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="space-y-2 mt-3">
            <Input
              placeholder="Buscar amigo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="max-h-[280px] overflow-y-auto space-y-1 pr-1">
              {filteredFriends.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {friends.length === 0
                    ? 'Aún no tienes amigos. Añade alguno en la sección Amigos.'
                    : 'Sin resultados'}
                </div>
              ) : (
                filteredFriends.map((f) => (
                  <button
                    key={f.user_id}
                    onClick={() => handlePickFriend(f)}
                    className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/60 transition-colors text-left"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={f.avatar_url || undefined} />
                      <AvatarFallback>
                        {(f.full_name || f.username || '?').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {f.full_name || f.username || 'Usuario'}
                      </p>
                      {f.username && (
                        <p className="text-xs text-muted-foreground truncate">@{f.username}</p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="email" className="space-y-3 mt-3">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="email@ejemplo.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Si el email no está registrado, le enviaremos una invitación para canjear el regalo.
              </p>
            </div>
            <Button
              onClick={handlePickEmail}
              disabled={!isValidEmail(emailInput)}
              className="w-full rounded-full bg-gradient-to-r from-yusiop-primary via-yusiop-accent to-yusiop-secondary"
            >
              Continuar
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

const Row = ({
  label,
  value,
  highlight,
  danger,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  danger?: boolean;
}) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span
      className={`text-sm font-semibold truncate text-right ${
        danger ? 'text-destructive' : highlight ? 'text-primary' : ''
      }`}
    >
      {value}
    </span>
  </div>
);

export default GiftSongDialog;
