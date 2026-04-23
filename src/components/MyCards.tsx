import { useEffect, useState } from 'react';
import { CreditCard, Calendar, Hash, Sparkles, Gift, Music, Copy, Check, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const [cards, setCards] = useState<MyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MyCard | null>(null);
  const [copied, setCopied] = useState(false);

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
      const { data, error } = await supabase
        .from('qr_cards')
        .select('id, code, card_type, download_credits, origin, is_gift, created_at')
        .or(`owner_user_id.eq.${user.id},activated_by.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const hidden = new Set(getHiddenIds());
        setCards((data as MyCard[]).filter((c) => !hidden.has(c.id)));
      }
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
        <p className="text-sm">Aún no tienes tarjetas.</p>
        <p className="text-xs mt-1">Compra una en la Tienda o escanea un QR.</p>
      </div>
    );
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

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
                      <AlertDialogTitle>¿Eliminar esta tarjeta?</AlertDialogTitle>
                      <AlertDialogDescription>
                        La tarjeta agotada se eliminará de tu biblioteca. Esta acción no se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(c.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Eliminar
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
              Tarjeta {selected?.card_type === 'premium' ? 'Premium' : 'Estándar'}
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

              {/* Botón principal de copia rápida */}
              <Button
                onClick={() => handleCopy(selected.code)}
                className="w-full h-12 gap-2 font-semibold"
                variant={copied ? 'secondary' : 'default'}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    ¡Código copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar código manual
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center -mt-1">
                Pégalo en el escáner → "Introducir código manual"
              </p>

              <div className="space-y-3 pt-2">
                <div className="w-full flex items-center justify-between text-sm p-3 rounded-lg bg-muted/40">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Hash className="h-4 w-4" />
                    <span>Código</span>
                  </div>
                  <span className="font-mono font-bold">{selected.code}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CreditCard className="h-4 w-4" />
                    <span>Descargas restantes</span>
                  </div>
                  <span className="font-bold text-primary text-lg tabular-nums">
                    {selected.download_credits}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Activada</span>
                  </div>
                  <span>{formatDate(selected.created_at)}</span>
                </div>

                <div className="flex items-center gap-2 pt-2 flex-wrap">
                  <Badge variant="secondary" className="capitalize">
                    {selected.origin === 'digital' ? 'Digital' : 'Física'}
                  </Badge>
                  {selected.is_gift && (
                    <Badge variant="outline" className="gap-1">
                      <Gift className="h-3 w-3" /> Regalo
                    </Badge>
                  )}
                </div>

                {selected.download_credits <= 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full h-11 gap-2 mt-2">
                        <Trash2 className="h-4 w-4" />
                        Eliminar tarjeta agotada
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar esta tarjeta?</AlertDialogTitle>
                        <AlertDialogDescription>
                          La tarjeta agotada se eliminará de tu biblioteca. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(selected.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Eliminar
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
    </>
  );
};

export default MyCards;
