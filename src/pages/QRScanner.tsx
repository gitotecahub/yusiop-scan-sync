import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { QrCode, Camera, X } from 'lucide-react';
import { toast } from 'sonner';
import QrScanner from 'qr-scanner';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCreditsStore } from '@/stores/creditsStore';
import { qrCodeSchema } from '@/lib/validation';
import DigitalCard from '@/components/DigitalCard';

const QRScanner = () => {
  const location = useLocation();
  const prefillCode = (location.state as { prefillCode?: string } | null)?.prefillCode ?? '';
  const [manualCode, setManualCode] = useState(prefillCode);
  const [scanning, setScanning] = useState(false);
  const [activating, setActivating] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const navigate = useNavigate();
  const { setUserCredits } = useCreditsStore();
  const processingRef = useRef(false);

  const activateQRCode = async (code: string) => {
    if (activating) return;
    
    try {
      setActivating(true);
      
      // Obtener el usuario actual y su token de sesión
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user?.email) {
        toast.error('Debes iniciar sesión para activar una tarjeta QR');
        return;
      }

      // Llamar a la edge function para activar el QR
      const { data, error } = await supabase.functions.invoke('activate-qr', {
        body: { 
          code: code.trim(),
          userEmail: session.user.email
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        toast.error(error.message || 'Error al activar el QR');
        return;
      }

      if (!data?.success) {
        toast.error(data?.error || 'Error al activar el QR');
        return;
      }

      if (data.error) {
        toast.error(data.error);
        return;
      }

      // Éxito - mostrar mensaje
      toast.success(`¡${data.message}! ${data.credits} créditos disponibles`);
      stopScanning();

      // Recargar créditos REALES desde la base de datos (suma user_credits + qr_cards)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const [{ data: creditsRows }, { data: ownedCards }] = await Promise.all([
            supabase
              .from('user_credits')
              .select('*')
              .eq('user_email', user.email)
              .eq('is_active', true)
              .gt('credits_remaining', 0)
              .gt('expires_at', new Date().toISOString())
              .order('scanned_at', { ascending: false }),
            supabase
              .from('qr_cards')
              .select('card_type, download_credits')
              .or(`owner_user_id.eq.${user.id},activated_by.eq.${user.id}`)
              .gt('download_credits', 0),
          ]);

          const totalLegacy = (creditsRows ?? []).reduce((s, r: any) => s + (r.credits_remaining ?? 0), 0);
          const totalOwned = (ownedCards ?? []).reduce((s, c: any) => s + (c.download_credits ?? 0), 0);
          const total = totalLegacy + totalOwned;

          if (total > 0) {
            setUserCredits({
              credits_remaining: total,
              card_type: (creditsRows?.[0]?.card_type ?? ownedCards?.[0]?.card_type ?? data.cardType ?? 'standard') as string,
              expires_at: creditsRows?.[0]?.expires_at ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
              is_active: true,
            });
          }
        }
      } catch (e) {
        console.warn('No se pudo refrescar el balance', e);
      }

      // Redirigir al catálogo después de un breve delay
      setTimeout(() => {
        navigate('/catalog');
      }, 1500);

    } catch (error: any) {
      console.error('Error activating QR:', error);
      toast.error('Error al activar el QR');
    } finally {
      setActivating(false);
      processingRef.current = false;
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = qrCodeSchema.safeParse(manualCode);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    activateQRCode(parsed.data);
    setManualCode('');
  };

  const stopScanning = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
    setScanning(false);
  };

  const startScanning = () => {
    // Solo activamos el modo "escaneando"; la inicialización real
    // del scanner se hace en un useEffect después de que el <video>
    // exista en el DOM (evita referencias nulas en el primer click)
    setScanning(true);
  };

  useEffect(() => {
    if (!scanning) return;

    let cancelled = false;

    const init = async () => {
      try {
        if (!videoRef.current) return;

        // 1) Verificar cámara disponible
        const hasCamera = await QrScanner.hasCamera();
        if (!hasCamera) {
          toast.error('No se detectó ninguna cámara en este dispositivo');
          setScanning(false);
          return;
        }

        // 2) Pre-solicitar permisos y forzar SIEMPRE cámara trasera (nunca selfie/frontal)
        let preferredDeviceId: string | undefined;
        try {
          // Pedimos primero permiso usando facingMode environment (cámara trasera)
          const preflightStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
          });
          preflightStream.getTracks().forEach((t) => t.stop());

          // Ahora que ya tenemos permiso, los labels están disponibles
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter((d) => d.kind === 'videoinput');

          // Buscar explícitamente cámara trasera por etiqueta
          const back = videoInputs.find((d) => /back|rear|environment|trasera|posterior/i.test(d.label));

          // Si NO encontramos trasera por label pero hay varias cámaras,
          // descartar cualquiera que se identifique como frontal/selfie/user
          if (back) {
            preferredDeviceId = back.deviceId;
          } else if (videoInputs.length > 1) {
            const notFront = videoInputs.find(
              (d) => !/front|user|selfie|frontal/i.test(d.label),
            );
            preferredDeviceId = notFront?.deviceId;
          }
          // Si solo hay una cámara, dejamos que facingMode environment haga el trabajo
        } catch (permissionError) {
          console.error('Error de permisos:', permissionError);
          toast.error('Permisos de cámara denegados. Por favor permite el acceso a la cámara.');
          setScanning(false);
          return;
        }

        if (cancelled) return;

        // 3) Inicializar QrScanner forzando cámara trasera
        qrScannerRef.current = new QrScanner(
          videoRef.current!,
          (result) => {
            if (processingRef.current || activating) return;
            const code = (result.data ?? '').trim();
            const parsed = qrCodeSchema.safeParse(code);
            if (!parsed.success) return;
            processingRef.current = true;
            activateQRCode(parsed.data);
          },
          {
            returnDetailedScanResult: true,
            highlightScanRegion: true,
            highlightCodeOutline: true,
            preferredCamera: 'environment',
            maxScansPerSecond: 4,
          }
        );

        await qrScannerRef.current.start();

        // Forzar la cámara trasera tras arrancar:
        // 1º intentamos por deviceId concreto, 2º por facingMode 'environment'
        try {
          if (preferredDeviceId) {
            await qrScannerRef.current.setCamera(preferredDeviceId);
          } else {
            await qrScannerRef.current.setCamera('environment');
          }
        } catch (e) {
          console.warn('No se pudo fijar la cámara trasera, intentando environment.', e);
          try {
            await qrScannerRef.current.setCamera('environment');
          } catch (err) {
            console.warn('Tampoco se pudo aplicar environment.', err);
          }
        }

        toast.success('Cámara activada. Apunta al código QR');
      } catch (error: any) {
        console.error('Error al iniciar el scanner:', error);
        let msg = 'Error desconocido al acceder a la cámara';
        if (error?.name === 'NotAllowedError') msg = 'Permisos de cámara denegados.';
        else if (error?.name === 'NotFoundError') msg = 'No se encontró ninguna cámara.';
        else if (error?.name === 'NotReadableError') msg = 'La cámara está en uso por otra app.';
        else if (error?.message) msg = `Error: ${error.message}`;
        toast.error(msg);
        setScanning(false);
      }
    };

    const raf = requestAnimationFrame(() => {
      void init();
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (qrScannerRef.current) {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
        qrScannerRef.current = null;
      }
    };
  }, [scanning]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="display-xl text-4xl">
          Escanea<br /><span className="vapor-text">tu QR</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs">
          Apunta a una tarjeta o introduce el código manualmente.
        </p>
      </div>

      {/* Scanner */}
      <div className="blob-card p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="eyebrow mb-1.5">Activar Tarjeta</p>
            <h2 className="font-display text-xl font-bold leading-tight">Método rápido</h2>
          </div>
          <div className="w-11 h-11 rounded-2xl vapor-bg flex items-center justify-center shadow-glow">
            <QrCode className="h-5 w-5 text-primary-foreground" strokeWidth={1.8} />
          </div>
        </div>

        <div className="space-y-4">
          {scanning ? (
            <div className="space-y-3">
              <div className="relative overflow-hidden rounded-2xl">
                <video
                  ref={videoRef}
                  className="w-full h-64 bg-black object-cover"
                  playsInline
                  autoPlay
                  muted
                />
                <div className="absolute inset-6 border-2 border-primary rounded-xl pointer-events-none shadow-glow">
                  <span className="absolute -top-1 -left-1 w-4 h-4 border-t-[3px] border-l-[3px] border-primary rounded-tl-lg" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 border-t-[3px] border-r-[3px] border-primary rounded-tr-lg" />
                  <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-[3px] border-l-[3px] border-primary rounded-bl-lg" />
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-[3px] border-r-[3px] border-primary rounded-br-lg" />
                </div>
              </div>
              <Button onClick={stopScanning} variant="outline" className="w-full rounded-full border-border hover:bg-muted gap-2 h-11">
                <X className="h-4 w-4" />
                Detener
              </Button>
            </div>
          ) : (
            <Button onClick={startScanning} className="w-full h-12 rounded-full vapor-bg text-primary-foreground hover:opacity-90 gap-2 font-bold shadow-glow">
              <Camera className="h-4 w-4" />
              Usar Cámara
            </Button>
          )}

          <div className="flex items-center gap-3">
            <span className="flex-1 h-px bg-border" />
            <span className="eyebrow">o</span>
            <span className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleManualSubmit} className="space-y-3">
            <div>
              <p className="eyebrow mb-2">Código manual</p>
              <Input
                placeholder="CÓDIGO DE TARJETA"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="rounded-2xl border-border bg-input text-center tracking-[0.3em] uppercase font-mono h-12"
              />
            </div>
            <Button
              type="submit"
              variant="outline"
              className="w-full h-11 rounded-full border-primary/40 bg-transparent text-foreground hover:bg-primary/10 font-semibold"
              disabled={!manualCode.trim() || activating}
            >
              {activating ? 'Activando…' : 'Activar Tarjeta'}
            </Button>
          </form>
        </div>
      </div>

      {/* Card types — tarjetas reales de muestra */}
      <div>
        <p className="eyebrow mb-3">Tipos de tarjeta</p>
        <div className="grid grid-cols-2 gap-3">
          <DigitalCard
            code="YUSIOP-DEMO-A7K9X2"
            cardType="standard"
            downloadCredits={4}
            qrValue="YUSIOP-DEMO-STANDARD"
            compact
          />
          <DigitalCard
            code="YUSIOP-DEMO-B3R7D9"
            cardType="premium"
            downloadCredits={10}
            qrValue="YUSIOP-DEMO-PREMIUM"
            compact
          />
        </div>
      </div>
    </div>
  );
};

export default QRScanner;