import { useEffect, useState } from 'react';
import { CreditCard, Calendar, Hash, Sparkles, Gift, Music, Copy, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import DigitalCard from '@/components/DigitalCard';

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

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('qr_cards')
        .select('id, code, card_type, download_credits, origin, is_gift, created_at')
        .or(`owner_user_id.eq.${user.id},activated_by.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (!error && data) setCards(data as MyCard[]);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="aspect-[1.586/1] w-full rounded-2xl" />
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
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelected(c)}
            className="text-left transition-transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/60 rounded-2xl"
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
        ))}
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
              />

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-sm">
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
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MyCards;
