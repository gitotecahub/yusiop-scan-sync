import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gift, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import DigitalCard from '@/components/DigitalCard';

type RedeemResult = {
  success: boolean;
  message?: string;
  card_id: string;
  card_type: 'standard' | 'premium';
  download_credits: number;
};

const Redeem = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<RedeemResult | null>(null);

  useEffect(() => {
    if (!session && token) {
      sessionStorage.setItem('pending_gift_token', token);
      navigate('/auth?redirect=/redeem/' + token, { replace: true });
    }
  }, [session, token, navigate]);

  const handleRedeem = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('redeem-gift', {
        body: { token },
      });
      if (error) throw error;
      const result = data?.result as RedeemResult | undefined;
      if (!result?.success) {
        toast.error(result?.message ?? 'No se pudo canjear');
        return;
      }
      sessionStorage.removeItem('pending_gift_token');
      toast.success(`¡Tarjeta ${result.card_type} activada!`);
      setDone(result);
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al canjear');
    } finally {
      setLoading(false);
    }
  };

  if (!session) return null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            {done ? (
              <Check className="h-8 w-8 text-primary" />
            ) : (
              <Gift className="h-8 w-8 text-primary" />
            )}
          </div>
          <CardTitle>{done ? '¡Tarjeta activada!' : 'Tienes un regalo'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {done ? (
            <>
              <DigitalCard
                code={done.card_id}
                cardType={done.card_type}
                downloadCredits={done.download_credits}
                isGift
                celebrate
              />
              <p className="text-muted-foreground text-sm">
                {done.download_credits} descargas añadidas a tu cuenta.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => navigate('/profile')}>
                  Ver mis tarjetas
                </Button>
                <Button onClick={() => navigate('/library')}>Ir a biblioteca</Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-muted-foreground">
                Canjea tu tarjeta YUSIOP para empezar a descargar música.
              </p>
              <Button className="w-full" onClick={handleRedeem} disabled={loading}>
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Canjear ahora'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Redeem;
