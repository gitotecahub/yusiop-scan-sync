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
    <div className="space-y-7">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="editorial-rule" />
          <p className="eyebrow">Sección 01 · Activa</p>
        </div>
        <h1 className="display-xl text-5xl">Escanear<br /><span className="gold-text">QR.</span></h1>
        <p className="text-sm text-muted-foreground mt-3 max-w-xs">
          Apunta a una tarjeta o introduce el código manualmente.
        </p>
      </div>

      {/* Scanner */}
      <div className="border border-border p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="eyebrow mb-2">Método 01</p>
            <h2 className="font-display text-xl font-bold leading-tight">Activar Tarjeta</h2>
          </div>
          <div className="w-10 h-10 border border-primary/40 flex items-center justify-center">
            <QrCode className="h-5 w-5 text-primary" strokeWidth={1.5} />
          </div>
        </div>

        <div className="space-y-5">
          {scanning ? (
            <div className="space-y-3">
              <div className="relative overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-64 bg-black object-cover"
                  playsInline
                  autoPlay
                  muted
                />
                <div className="absolute inset-6 border border-primary pointer-events-none">
                  <span className="absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2 border-primary" />
                  <span className="absolute -top-px -right-px w-3 h-3 border-t-2 border-r-2 border-primary" />
                  <span className="absolute -bottom-px -left-px w-3 h-3 border-b-2 border-l-2 border-primary" />
                  <span className="absolute -bottom-px -right-px w-3 h-3 border-b-2 border-r-2 border-primary" />
                </div>
              </div>
              <Button onClick={stopScanning} variant="outline" className="w-full rounded-none border-border hover:bg-muted gap-2 h-11">
                <X className="h-4 w-4" />
                Detener Escaneo
              </Button>
            </div>
          ) : (
            <Button onClick={startScanning} className="w-full h-12 rounded-none bg-primary text-primary-foreground hover:bg-primary/90 gap-2 font-medium tracking-wide">
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
              <p className="eyebrow mb-2">Método 02 · Manual</p>
              <Input
                placeholder="CÓDIGO DE LA TARJETA"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="rounded-none border-border bg-input text-center tracking-[0.3em] uppercase font-mono h-12"
              />
            </div>
            <Button
              type="submit"
              variant="outline"
              className="w-full h-11 rounded-none border-primary/40 bg-transparent text-foreground hover:bg-primary/10 font-medium tracking-wide"
              disabled={!manualCode.trim() || activating}
            >
              {activating ? 'Activando…' : 'Activar Tarjeta'}
            </Button>
          </form>
        </div>
      </div>

      {/* Card types — editorial table */}
      <div>
        <p className="eyebrow mb-3">Tipos de tarjeta</p>
        <div className="border-t border-border">
          <div className="flex items-baseline justify-between py-5 border-b border-border">
            <div>
              <p className="font-display text-lg font-bold">Estándar</p>
              <p className="text-xs text-muted-foreground mt-1">Para descubrir nueva música</p>
            </div>
            <div className="text-right">
              <p className="display-xl text-3xl">04</p>
              <p className="eyebrow mt-1">descargas</p>
            </div>
          </div>
          <div className="flex items-baseline justify-between py-5 border-b border-border">
            <div>
              <p className="font-display text-lg font-bold gold-text">Premium</p>
              <p className="text-xs text-muted-foreground mt-1">Para los más fanáticos</p>
            </div>
            <div className="text-right">
              <p className="display-xl text-3xl gold-text">10</p>
              <p className="eyebrow mt-1">descargas</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;