import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Gift, Check, Loader2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import DigitalCard from '@/components/DigitalCard';

type Tier = 'standard' | 'premium';

const TIERS: Record<Tier, { label: string; price: string; credits: number; perks: string[] }> = {
  standard: {
    label: 'YUSIOP Estándar',
    price: '4,99€',
    credits: 4,
    perks: ['4 descargas', 'Calidad máxima', 'Sin caducidad'],
  },
  premium: {
    label: 'YUSIOP Premium',
    price: '9,99€',
    credits: 10,
    perks: ['10 descargas', 'Calidad máxima', 'Acceso prioritario'],
  },
};

const Store = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Tier>('standard');
  const [isGift, setIsGift] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get('status');
    if (status === 'success') {
      toast.success('🎉 ¡Felicidades! Tu compra se ha completado. Tu tarjeta ya está disponible.', {
        duration: 2500,
      });
      navigate('/library', { replace: true });
    } else if (status === 'cancelled') {
      toast.info('Compra cancelada.');
      navigate('/store', { replace: true });
    }
  }, [location.search, navigate]);

  const handleCheckout = async () => {
    if (isGift && !recipient.includes('@')) {
      toast.error('Introduce un email válido para el destinatario.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-card-checkout', {
        body: {
          card_type: selected,
          is_gift: isGift,
          gift_recipient_email: isGift ? recipient.trim() : undefined,
          gift_message: isGift ? message.trim() : undefined,
        },
      });
      if (error) throw error;
      if (data?.url) {
        // Redirigir en la misma pestaña para que el usuario vuelva a la app tras pagar
        window.location.href = data.url;
      } else {
        throw new Error('No se recibió URL de pago');
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? 'Error iniciando el pago');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async () => {
    if (isGift && !recipient.includes('@')) {
      toast.error('Introduce un email válido para el destinatario.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('simulate-card-purchase', {
        body: {
          card_type: selected,
          is_gift: isGift,
          gift_recipient_email: isGift ? recipient.trim() : undefined,
          gift_message: isGift ? message.trim() : undefined,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error('No se pudo simular la compra');

      if (isGift && data.redemption_token) {
        const link = `${window.location.origin}/redeem/${data.redemption_token}`;
        await navigator.clipboard.writeText(link).catch(() => {});
        toast.success('🎁 Regalo creado. Link de canje copiado al portapapeles.', { duration: 6000 });
        navigate('/library', { replace: true });
      } else {
        toast.success('🎉 ¡Felicidades! Compra simulada con éxito. Tu tarjeta ya está activa.', { duration: 6000 });
        navigate('/library', { replace: true });
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? 'Error simulando la compra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-32 px-4 pt-6 max-w-md mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Tienda</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Compra tarjetas digitales para descargar tu música
        </p>
      </header>

      <Tabs value={selected} onValueChange={(v) => setSelected(v as Tier)} className="mb-6">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="standard">Estándar</TabsTrigger>
          <TabsTrigger value="premium">
            <Sparkles className="h-3.5 w-3.5 mr-1" /> Premium
          </TabsTrigger>
        </TabsList>

        {(Object.keys(TIERS) as Tier[]).map((t) => (
          <TabsContent key={t} value={t} className="mt-4 space-y-4">

            <Card className="overflow-hidden border-primary/20">
              <CardHeader className="bg-gradient-to-br from-primary/10 to-transparent">
                <CardTitle className="flex items-baseline justify-between">
                  <span>{TIERS[t].label}</span>
                  <span className="text-2xl font-bold text-primary">{TIERS[t].price}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2">
                {TIERS[t].perks.map((p) => (
                  <div key={p} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" />
                    <span>{p}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Card className="mb-6">
        <CardContent className="pt-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-primary" />
              <Label htmlFor="gift-toggle" className="font-medium cursor-pointer">
                Comprar como regalo
              </Label>
            </div>
            <Switch id="gift-toggle" checked={isGift} onCheckedChange={setIsGift} />
          </div>

          {isGift && (
            <div className="space-y-3 pt-2">
              <div>
                <Label htmlFor="recipient">Email del destinatario</Label>
                <Input
                  id="recipient"
                  type="email"
                  placeholder="amigo@ejemplo.com"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="message">Mensaje (opcional)</Label>
                <Textarea
                  id="message"
                  placeholder="¡Disfruta de la música!"
                  maxLength={280}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        className="w-full h-12 text-base font-semibold"
        onClick={handleCheckout}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>Pagar {TIERS[selected].price}{isGift ? ' como regalo' : ''}</>
        )}
      </Button>

      <Button
        variant="outline"
        className="w-full h-12 text-base font-semibold mt-3 border-dashed border-primary/40 text-primary hover:bg-primary/10"
        onClick={handleSimulate}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            <Zap className="h-4 w-4 mr-2" />
            Simular compra (sin pago)
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center mt-3">
        Pago seguro con Stripe · La simulación crea la tarjeta al instante
      </p>
    </div>
  );
};

export default Store;
