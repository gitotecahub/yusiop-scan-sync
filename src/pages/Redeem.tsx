import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2, Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import DigitalCard from '@/components/DigitalCard';

type CardType = 'standard' | 'premium';

type RedeemResult = {
  success: boolean;
  message?: string;
  card_id: string;
  card_type: CardType;
  download_credits: number;
};

type GiftPreview = {
  code: string;
  card_type: CardType;
  download_credits: number;
  gift_redeemed: boolean;
};

const Redeem = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [preview, setPreview] = useState<GiftPreview | null>(null);
  const [done, setDone] = useState<RedeemResult | null>(null);

  // Redirige a auth si no hay sesión
  useEffect(() => {
    if (!session && token) {
      sessionStorage.setItem('pending_gift_token', token);
      navigate('/auth?redirect=/redeem/' + token, { replace: true });
    }
  }, [session, token, navigate]);

  // Cargar preview de la tarjeta a partir del token
  useEffect(() => {
    if (!session || !token) return;
    let active = true;
    (async () => {
      setPreviewLoading(true);
      const { data, error } = await supabase
        .from('qr_cards')
        .select('code, card_type, download_credits, gift_redeemed')
        .eq('redemption_token', token)
        .maybeSingle();
      if (!active) return;
      if (error || !data) {
        toast.error('Tarjeta no encontrada o token inválido');
      } else {
        setPreview(data as GiftPreview);
      }
      setPreviewLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [session, token]);

  const handleRedeem = async () => {
    if (!token) return;
    setLoading(true);
    try {
      // Refrescar sesión por si el JWT está caducado (causa "session_not_found")
      const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshed.session) {
        // Sesión inválida → forzar login y reintentar después
        sessionStorage.setItem('pending_gift_token', token);
        toast.error('Tu sesión ha expirado. Inicia sesión de nuevo.');
        navigate('/auth?redirect=/redeem/' + token, { replace: true });
        return;
      }

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
      const msg = String(e?.message ?? '');
      if (msg.toLowerCase().includes('unauthorized') || msg.includes('401')) {
        sessionStorage.setItem('pending_gift_token', token);
        toast.error('Sesión no válida. Inicia sesión de nuevo.');
        navigate('/auth?redirect=/redeem/' + token, { replace: true });
      } else {
        toast.error(msg || 'Error al canjear');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!session) return null;

  // Datos a mostrar en la DigitalCard (preview o resultado)
  const cardData = done
    ? {
        code: done.card_id,
        cardType: done.card_type,
        credits: done.download_credits,
      }
    : preview
      ? {
          code: preview.code,
          cardType: preview.card_type,
          credits: preview.download_credits,
        }
      : null;

  const alreadyRedeemed = !done && preview?.gift_redeemed;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            {done ? (
              <Check className="h-7 w-7 text-primary" />
            ) : (
              <Sparkles className="h-7 w-7 text-primary" />
            )}
          </div>
          <h1 className="text-2xl font-display font-black">
            {done ? '¡Tarjeta activada!' : 'Tienes un regalo'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {done
              ? `${done.download_credits} descargas añadidas a tu cuenta.`
              : alreadyRedeemed
                ? 'Esta tarjeta ya fue canjeada anteriormente.'
                : 'Esta es tu tarjeta YUSIOP. Canjéala para empezar a descargar música.'}
          </p>
        </div>

        {/* Tarjeta digital con confeti */}
        <div className="relative">
          {previewLoading && !done ? (
            <div className="aspect-[1.586/1] rounded-[28px] bg-muted/40 animate-pulse" />
          ) : cardData ? (
            <DigitalCard
              code={cardData.code}
              cardType={cardData.cardType}
              downloadCredits={cardData.credits}
              isGift
              celebrate={!alreadyRedeemed}
            />
          ) : null}
        </div>

        {/* Acciones */}
        {done ? (
          <div className="grid grid-cols-2 gap-2">
            <Button asChild variant="outline">
              <Link to="/library?tab=cards">Ver mis tarjetas</Link>
            </Button>
            <Button asChild>
              <Link to="/catalog">Ir al catálogo</Link>
            </Button>
          </div>
        ) : (
          <Button
            className="w-full h-12 text-base font-semibold"
            onClick={handleRedeem}
            disabled={loading || previewLoading || alreadyRedeemed}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : alreadyRedeemed ? (
              'Tarjeta ya canjeada'
            ) : (
              'Canjear ahora'
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default Redeem;
