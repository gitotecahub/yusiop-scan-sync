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
    <div className="space-y-5">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Activa</p>
        <h1 className="font-display text-3xl font-bold">Escanear QR</h1>
        <p className="text-sm text-muted-foreground">Apunta a una tarjeta o escribe el código</p>
      </div>

      {/* Scanner Card */}
      <div className="relative overflow-hidden glass rounded-3xl p-5">
        <div className="absolute -top-16 -left-16 w-48 h-48 vapor-gradient rounded-full blur-3xl opacity-30" />

        <div className="relative text-center mb-5">
          <div className="mx-auto w-16 h-16 rounded-2xl glass flex items-center justify-center mb-3 shadow-glow">
            <QrCode className="h-8 w-8 vapor-text" />
          </div>
          <h2 className="font-display text-lg font-bold">Activar Tarjeta</h2>
          <p className="text-xs text-muted-foreground">Usa la cámara o ingresa el código manualmente</p>
        </div>

        <div className="relative space-y-5">
          {/* Camera */}
          {scanning ? (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-64 bg-black object-cover"
                  playsInline
                  autoPlay
                  muted
                />
                <div className="absolute inset-4 border-2 border-white/60 rounded-2xl pointer-events-none" />
                <div className="absolute inset-0 ring-1 ring-white/10 rounded-2xl pointer-events-none" />
              </div>
              <Button onClick={stopScanning} variant="outline" className="w-full rounded-2xl border-white/20 bg-white/5 hover:bg-white/10 gap-2">
                <X className="h-4 w-4" />
                Detener Escaneo
              </Button>
            </div>
          ) : (
            <Button onClick={startScanning} className="w-full h-12 rounded-2xl vapor-gradient text-primary-foreground border-0 shadow-glow gap-2 hover:opacity-90">
              <Camera className="h-4 w-4" />
              Usar Cámara
            </Button>
          )}

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-[0.25em]">
              <span className="bg-background/80 backdrop-blur px-3 text-muted-foreground">o ingresa manualmente</span>
            </div>
          </div>

          {/* Manual Input */}
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <Input
              placeholder="Código de la tarjeta QR"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="yusiop-input text-center tracking-widest uppercase"
            />
            <Button
              type="submit"
              className="w-full h-11 rounded-2xl glass border border-white/20 hover:bg-white/10 font-semibold"
              disabled={!manualCode.trim() || activating}
            >
              {activating ? 'Activando…' : 'Activar Tarjeta'}
            </Button>
          </form>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="relative overflow-hidden glass rounded-3xl p-4">
          <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br from-violet-400/40 to-indigo-400/40 blur-2xl" />
          <div className="relative">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Estándar</p>
            <p className="font-display text-3xl font-bold mt-1">4</p>
            <p className="text-xs text-muted-foreground -mt-1">descargas</p>
            <p className="text-[11px] text-muted-foreground/80 mt-2">Para descubrir nueva música</p>
          </div>
        </div>
        <div className="relative overflow-hidden glass rounded-3xl p-4">
          <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br from-cyan-300/40 to-emerald-300/40 blur-2xl" />
          <div className="relative">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Premium</p>
            <p className="font-display text-3xl font-bold vapor-text mt-1">10</p>
            <p className="text-xs text-muted-foreground -mt-1">descargas</p>
            <p className="text-[11px] text-muted-foreground/80 mt-2">Para los más fanáticos</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;