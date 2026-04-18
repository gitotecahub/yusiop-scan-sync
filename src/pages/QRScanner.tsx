import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { QrCode, Camera, X } from 'lucide-react';
import { toast } from 'sonner';
import QrScanner from 'qr-scanner';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useCreditsStore } from '@/stores/creditsStore';
import { qrCodeSchema } from '@/lib/validation';

const QRScanner = () => {
  const [manualCode, setManualCode] = useState('');
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

      // Éxito - mostrar mensaje y actualizar créditos localmente
      toast.success(`¡${data.message}! ${data.credits} créditos disponibles`);
      stopScanning();
      
      // Actualizar los créditos en el store local
      if (data.credits && data.cardType) {
        setUserCredits({
          credits_remaining: data.credits,
          card_type: data.cardType,
          expires_at: data.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          is_active: true
        });
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

        // 2) Pre-solicitar permisos y detectar cámara trasera si existe
        let preferredDeviceId: string | undefined;
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter((d) => d.kind === 'videoinput');
          const back = videoInputs.find((d) => /back|rear|environment/i.test(d.label));
          preferredDeviceId = (back ?? videoInputs[0])?.deviceId;

          const constraints: MediaStreamConstraints = {
            video: preferredDeviceId
              ? { deviceId: { exact: preferredDeviceId } }
              : { facingMode: { ideal: 'environment' } },
          };
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          // Cerrar stream de preflight
          stream.getTracks().forEach((t) => t.stop());
        } catch (permissionError) {
          console.error('Error de permisos:', permissionError);
          toast.error('Permisos de cámara denegados. Por favor permite el acceso a la cámara.');
          setScanning(false);
          return;
        }

        if (cancelled) return;

        // 3) Inicializar QrScanner
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

        // Si detectamos deviceId de la cámara trasera, intentamos fijarla
        if (preferredDeviceId) {
          try {
            await qrScannerRef.current.setCamera(preferredDeviceId);
          } catch (e) {
            console.warn('No se pudo fijar la cámara preferida, usando por defecto.', e);
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
        <span className="chip chip-vapor mb-3">
          <QrCode className="h-3 w-3" /> Sección 01
        </span>
        <h1 className="display-xl text-4xl mt-2">
          Escanea<br /><span className="vapor-text">tu QR.</span>
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

      {/* Card types — gradient cards */}
      <div>
        <p className="eyebrow mb-3">Tipos de tarjeta</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="blob-card blob-card-aurora p-5">
            <p className="font-display text-lg font-bold">Estándar</p>
            <p className="text-[11px] text-foreground/70 mt-1 mb-4">Para descubrir</p>
            <p className="display-xl text-4xl">04</p>
            <p className="eyebrow mt-1">descargas</p>
          </div>
          <div className="blob-card blob-card-sunset p-5">
            <p className="font-display text-lg font-bold vapor-text">Premium</p>
            <p className="text-[11px] text-foreground/70 mt-1 mb-4">Para fanáticos</p>
            <p className="display-xl text-4xl vapor-text">10</p>
            <p className="eyebrow mt-1">descargas</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;