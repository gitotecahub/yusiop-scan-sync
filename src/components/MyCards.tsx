import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Calendar, Hash, Sparkles, Gift, Music, Copy, Check, Trash2, Send, Loader2, ScanLine, Share2 } from 'lucide-react';
import ShareWithFriendsDialog from '@/components/friends/ShareWithFriendsDialog';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useLanguageStore } from '@/stores/languageStore';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import DigitalCard from '@/components/DigitalCard';

const HIDDEN_KEY = 'yusiop_hidden_cards';
const getHiddenIds = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? '[]');
  } catch {
    return [];
  }
};
const addHiddenId = (id: string) => {
  const ids = getHiddenIds();
  if (!ids.includes(id)) {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify([...ids, id]));
  }
};

interface MyCard {
  id: string;
  code: string;
  card_type: 'standard' | 'premium';
  download_credits: number;
  origin: 'physical' | 'digital';
  is_gift: boolean;
  created_at: string;
}

const MyCards = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguageStore();
  const [cards, setCards] = useState<MyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MyCard | null>(null);
  const [copied, setCopied] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [giftUsername, setGiftUsername] = useState('');
  const [giftMessage, setGiftMessage] = useState('');
  const [gifting, setGifting] = useState(false);
  const [shareCardOpen, setShareCardOpen] = useState(false);

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Código copiado al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar el código');
    }
  };

  const handleDelete = (id: string) => {
    addHiddenId(id);
    setCards((prev) => prev.filter((c) => c.id !== id));
    setSelected(null);
    toast.success('Tarjeta eliminada de tu biblioteca');
  };

  const handleGift = async () => {
    if (!selected) return;
    const username = giftUsername.trim().replace(/^@/, '');
    if (!username) {
      toast.error('Introduce el username del destinatario');
      return;
    }
    setGifting(true);
    try {
      const { data, error } = await supabase.rpc('transfer_card_to_user', {
        p_card_id: selected.id,
        p_recipient_username: username,
        p_gift_message: giftMessage.trim() || null,
      });
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      if (!result?.success) {
        toast.error(result?.message ?? 'No se pudo regalar la tarjeta');
        return;
      }
      toast.success(result.message);
      // Quitar la tarjeta de la lista local (ya no es del usuario)
      setCards((prev) => prev.filter((c) => c.id !== selected.id));
      setGiftOpen(false);
      setSelected(null);
      setGiftUsername('');
      setGiftMessage('');
    } catch (e) {
      toast.error((e as Error).message ?? 'Error al regalar la tarjeta');
    } finally {
      setGifting(false);
    }
  };

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let userId: string | null = null;

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      userId = user.id;

      // 1) Tarjetas ya activadas o de las que es propietario
      const ownedRes = await supabase
        .from('qr_cards')
        .select('id, code, card_type, download_credits, origin, is_gift, created_at')
        .or(`owner_user_id.eq.${user.id},activated_by.eq.${user.id}`)
        .order('created_at', { ascending: false });

      // 2) Tarjetas digitales compradas por el usuario pero aún sin activar
      //    (no son regalo para otra persona). Se enlazan vía purchase_id -> card_purchases.buyer_user_id
      const purchasedRes = await supabase
        .from('card_purchases')
        .select('qr_card_id, is_gift, qr_cards!inner(id, code, card_type, download_credits, origin, is_gift, created_at, is_activated, owner_user_id)')
        .eq('buyer_user_id', user.id)
        .eq('status', 'paid')
        .eq('is_gift', false)
        .not('qr_card_id', 'is', null);

      const map = new Map<string, MyCard>();
      (ownedRes.data ?? []).forEach((c: any) => map.set(c.id, c as MyCard));
      (purchasedRes.data ?? []).forEach((p: any) => {
        const c = p.qr_cards;
        if (!c) return;
        // Solo añadir si no está activada y no tiene dueño (sigue pendiente)
        if (c.is_activated || c.owner_user_id) return;
        if (!map.has(c.id)) {
          map.set(c.id, {
            id: c.id,
            code: c.code,
            card_type: c.card_type,
            download_credits: c.download_credits,
            origin: c.origin,
            is_gift: c.is_gift,
            created_at: c.created_at,
          });
        }
      });

      const hidden = new Set(getHiddenIds());
      const merged = Array.from(map.values())
        .filter((c) => !hidden.has(c.id))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setCards(merged);
      setLoading(false);
    };

    const setupRealtime = () => {
      if (!userId) return;
      channel = supabase
        .channel(`my-cards-${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'qr_cards', filter: `owner_user_id=eq.${userId}` },
          () => load()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'qr_cards', filter: `activated_by=eq.${userId}` },
          () => load()
        )
        .subscribe();
    };

    load().then(setupRealtime);

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 auto-rows-min">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="aspect-[1.4/1] w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">
          {language === 'es' ? 'Aún no tienes tarjetas.' :
           language === 'en' ? 'You have no cards yet.' :
           language === 'fr' ? "Vous n'avez pas encore de cartes." :
           'Você ainda não tem cartões.'}
        </p>
        <p className="text-xs mt-1">
          {language === 'es' ? 'Compra una en la Tienda o escanea un QR.' :
           language === 'en' ? 'Buy one in the Store or scan a QR.' :
           language === 'fr' ? "Achetez-en une dans la Boutique ou scannez un QR." :
           'Compre um na Loja ou escaneie um QR.'}
        </p>
      </div>
    );
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString(language === 'es' ? 'es-ES' : language === 'fr' ? 'fr-FR' : language === 'pt' ? 'pt-PT' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <>
      <div className="grid grid-cols-2 gap-3 auto-rows-min">
        {cards.map((c) => {
          const depleted = c.download_credits <= 0;
          return (
            <div key={c.id} className="relative group">
              <button
                onClick={() => setSelected(c)}
                className="w-full text-left transition-transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/60 rounded-2xl"
                aria-label={`Ver detalles de tarjeta ${c.card_type}`}
              >
                <DigitalCard
                  code={c.code}
                  cardType={c.card_type}
                  downloadCredits={c.download_credits}
                  isGift={c.is_gift}
                  compact
                />
              </button>

              {depleted && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-2 right-2 h-7 w-7 rounded-full bg-primary/20 hover:bg-primary/35 text-primary-foreground flex items-center justify-center backdrop-blur-md border border-primary/30 shadow-sm ring-1 ring-white/10 transition-all hover:scale-110"
                      aria-label="Eliminar tarjeta agotada"
                    >
                      <Trash2 className="h-3 w-3" strokeWidth={2.2} />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {language === 'es' ? '¿Eliminar esta tarjeta?' :
                         language === 'en' ? 'Delete this card?' :
                         language === 'fr' ? 'Supprimer cette carte ?' :
                         'Excluir este cartão?'}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {language === 'es' ? 'La tarjeta agotada se eliminará de tu biblioteca. Esta acción no se puede deshacer.' :
                         language === 'en' ? 'The depleted card will be removed from your library. This action cannot be undone.' :
                         language === 'fr' ? 'La carte épuisée sera supprimée de votre bibliothèque. Cette action ne peut pas être annulée.' :
                         'O cartão esgotado será removido da sua biblioteca. Esta ação não pode ser desfeita.'}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>
                        {language === 'es' ? 'Cancelar' :
                         language === 'en' ? 'Cancel' :
                         language === 'fr' ? 'Annuler' :
                         'Cancelar'}
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(c.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {language === 'es' ? 'Eliminar' :
                         language === 'en' ? 'Delete' :
                         language === 'fr' ? 'Supprimer' :
                         'Excluir'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selected?.card_type === 'premium' ? (
                <Sparkles className="h-5 w-5 text-primary" />
              ) : (
                <Music className="h-5 w-5 text-primary" />
              )}
              {selected?.card_type === 'premium' ? t('card.premium') : t('card.standard')}
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <DigitalCard
                code={selected.code}
                cardType={selected.card_type}
                downloadCredits={selected.download_credits}
                isGift={selected.is_gift}
                celebrate
              />

              {/* Botón principal: Canjear (lleva al escáner con código pre-rellenado) */}
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    navigate('/qr', { state: { prefillCode: selected.code } });
                    setSelected(null);
                  }}
                  className="flex-1 h-12 gap-2 font-semibold"
                >
                  <ScanLine className="h-4 w-4" />
                  {t('card.redeem')}
                </Button>
                <Button
                  onClick={() => handleCopy(selected.code)}
                  variant={copied ? 'secondary' : 'outline'}
                  size="icon"
                  className="h-12 w-12 shrink-0"
                  aria-label={t('card.copy')}
                  title={t('card.copy')}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center -mt-1">
                {language === 'es' ? 'Pulsa "Canjear" para activar la tarjeta en el escáner' : 
                 language === 'en' ? 'Tap "Redeem" to activate the card in the scanner' :
                 language === 'fr' ? 'Appuyez sur "Utiliser" pour activer la carte' :
                 'Toque "Resgatar" para ativar o cartão'}
              </p>

              <div className="space-y-3 pt-2">
                <div className="w-full flex items-center justify-between text-sm p-3 rounded-lg bg-muted/40">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Hash className="h-4 w-4" />
                    <span>
                      {language === 'es' ? 'Código' :
                       language === 'en' ? 'Code' :
                       language === 'fr' ? 'Code' :
                       'Código'}
                    </span>
                  </div>
                  <span className="font-mono font-bold">{selected.code}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CreditCard className="h-4 w-4" />
                    <span>
                      {language === 'es' ? 'Descargas restantes' :
                       language === 'en' ? 'Downloads remaining' :
                       language === 'fr' ? 'Téléchargements restants' :
                       'Downloads restantes'}
                    </span>
                  </div>
                  <span className="font-bold text-primary text-lg tabular-nums">
                    {selected.download_credits}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {language === 'es' ? 'Activada' :
                       language === 'en' ? 'Activated' :
                       language === 'fr' ? 'Activée' :
                       'Ativado'}
                    </span>
                  </div>
                  <span>{formatDate(selected.created_at)}</span>
                </div>

                <div className="flex items-center gap-2 pt-2 flex-wrap">
                  <Badge variant="secondary" className="capitalize">
                    {selected.origin === 'digital' 
                      ? (language === 'es' ? 'Digital' : language === 'en' ? 'Digital' : language === 'fr' ? 'Numérique' : 'Digital')
                      : (language === 'es' ? 'Física' : language === 'en' ? 'Physical' : language === 'fr' ? 'Physique' : 'Física')}
                  </Badge>
                  {selected.is_gift && (
                    <Badge variant="outline" className="gap-1">
                      <Gift className="h-3 w-3" /> 
                      {language === 'es' ? 'Regalo' : language === 'en' ? 'Gift' : language === 'fr' ? 'Cadeau' : 'Presente'}
                    </Badge>
                  )}
                </div>

                {selected.download_credits > 0 && (
                  <Button
                    onClick={() => setGiftOpen(true)}
                    variant="outline"
                    className="w-full h-11 gap-2 mt-2 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
                  >
                    <Gift className="h-4 w-4" />
                    {language === 'es' ? 'Regalar esta tarjeta' :
                     language === 'en' ? 'Gift this card' :
                     language === 'fr' ? 'Offrir cette carte' :
                     'Presentear este cartão'}
                  </Button>
                )}

                {selected.download_credits <= 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full h-11 gap-2 mt-2">
                        <Trash2 className="h-4 w-4" />
                        {language === 'es' ? 'Eliminar tarjeta agotada' :
                         language === 'en' ? 'Delete depleted card' :
                         language === 'fr' ? 'Supprimer carte épuisée' :
                         'Excluir cartão esgotado'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {language === 'es' ? '¿Eliminar esta tarjeta?' :
                           language === 'en' ? 'Delete this card?' :
                           language === 'fr' ? 'Supprimer cette carte ?' :
                           'Excluir este cartão?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {language === 'es' ? 'La tarjeta agotada se eliminará de tu biblioteca. Esta acción no se puede deshacer.' :
                           language === 'en' ? 'The depleted card will be removed from your library. This action cannot be undone.' :
                           language === 'fr' ? 'La carte épuisée sera supprimée de votre bibliothèque. Cette action ne peut pas être annulée.' :
                           'O cartão esgotado será removido da sua biblioteca. Esta ação não pode ser desfeita.'}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>
                          {language === 'es' ? 'Cancelar' :
                           language === 'en' ? 'Cancel' :
                           language === 'fr' ? 'Annuler' :
                           'Cancelar'}
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(selected.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {language === 'es' ? 'Eliminar' :
                           language === 'en' ? 'Delete' :
                           language === 'fr' ? 'Supprimer' :
                           'Excluir'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación de regalo */}
      <Dialog
        open={giftOpen}
        onOpenChange={(open) => {
          if (!gifting) {
            setGiftOpen(open);
            if (!open) {
              setGiftUsername('');
              setGiftMessage('');
            }
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              {language === 'es' ? 'Regalar tarjeta' :
               language === 'en' ? 'Gift card' :
               language === 'fr' ? 'Offrir carte' :
               'Presentear cartão'}
            </DialogTitle>
            <DialogDescription>
              {language === 'es' ? 'La tarjeta pasará a la biblioteca del destinatario y dejará de estar en la tuya. Esta acción no se puede deshacer.' :
               language === 'en' ? 'The card will move to the recipient\'s library and leave yours. This action cannot be undone.' :
               language === 'fr' ? 'La carte passera à la bibliothèque du destinataire et quittera la vôtre. Cette action ne peut pas être annulée.' :
               'O cartão passará para a biblioteca do destinatário e sairá da sua. Esta ação não pode ser desfeita.'}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {language === 'es' ? 'Tarjeta' :
                     language === 'en' ? 'Card' :
                     language === 'fr' ? 'Carte' :
                     'Cartão'}
                  </span>
                  <span className="font-semibold capitalize">{selected.card_type === 'premium' ? t('card.premium') : t('card.standard')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {language === 'es' ? 'Descargas' :
                     language === 'en' ? 'Downloads' :
                     language === 'fr' ? 'Téléchargements' :
                     'Downloads'}
                  </span>
                  <span className="font-semibold text-primary">{selected.download_credits}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gift-username">
                  {language === 'es' ? 'Username del destinatario' :
                   language === 'en' ? 'Recipient username' :
                   language === 'fr' ? 'Nom d\'utilisateur du destinataire' :
                   'Username do destinatário'}
                </Label>
                <Input
                  id="gift-username"
                  placeholder="@username"
                  value={giftUsername}
                  onChange={(e) => setGiftUsername(e.target.value)}
                  disabled={gifting}
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gift-message">
                  {language === 'es' ? 'Mensaje (opcional)' :
                   language === 'en' ? 'Message (optional)' :
                   language === 'fr' ? 'Message (facultatif)' :
                   'Mensagem (opcional)'}
                </Label>
                <Textarea
                  id="gift-message"
                  placeholder={language === 'es' ? '¡Para que disfrutes la música!' : language === 'en' ? 'Enjoy the music!' : language === 'fr' ? 'Pour que tu profites de la musique !' : 'Para que você aproveite a música!'}
                  value={giftMessage}
                  onChange={(e) => setGiftMessage(e.target.value.slice(0, 280))}
                  disabled={gifting}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {giftMessage.length}/280
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setGiftOpen(false)}
              disabled={gifting}
            >
              {language === 'es' ? 'Cancelar' :
               language === 'en' ? 'Cancel' :
               language === 'fr' ? 'Annuler' :
               'Cancelar'}
            </Button>
            <Button onClick={handleGift} disabled={gifting || !giftUsername.trim()} className="gap-2">
              {gifting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {language === 'es' ? 'Enviando...' :
                   language === 'en' ? 'Sending...' :
                   language === 'fr' ? 'Envoi...' :
                   'Enviando...'}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {language === 'es' ? 'Confirmar regalo' :
                   language === 'en' ? 'Confirm gift' :
                   language === 'fr' ? 'Confirmer le cadeau' :
                   'Confirmar presente'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MyCards;
