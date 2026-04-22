import { useEffect, useState } from 'react';
import { CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
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
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="aspect-[1.586/1] w-full rounded-3xl" />
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

  return (
    <div className="space-y-4">
      {cards.map((c) => (
        <DigitalCard
          key={c.id}
          code={c.code}
          cardType={c.card_type}
          downloadCredits={c.download_credits}
          isGift={c.is_gift}
        />
      ))}
    </div>
  );
};

export default MyCards;
