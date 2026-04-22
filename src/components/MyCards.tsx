import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Sparkles, Gift } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

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
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
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
    <div className="space-y-3">
      {cards.map((c) => (
        <Card key={c.id} className="overflow-hidden">
          <CardContent className="p-4 flex items-center gap-3">
            <div
              className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                c.card_type === 'premium'
                  ? 'bg-gradient-to-br from-primary to-primary/60'
                  : 'bg-primary/15'
              }`}
            >
              {c.card_type === 'premium' ? (
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              ) : (
                <CreditCard className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold capitalize">{c.card_type}</p>
                {c.origin === 'digital' && (
                  <Badge variant="secondary" className="text-[10px] h-4">Digital</Badge>
                )}
                {c.is_gift && (
                  <Badge variant="outline" className="text-[10px] h-4">
                    <Gift className="h-2.5 w-2.5 mr-0.5" /> Regalo
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-mono truncate">{c.code}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-primary">{c.download_credits}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                descargas
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default MyCards;
