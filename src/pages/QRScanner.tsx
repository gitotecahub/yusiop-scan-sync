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
      toast.error(parsed.error.errors[0].message);
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
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Escanear QR</h1>
        <p className="text-muted-foreground">
          Escanea una tarjeta QR para activar tus descargas
        </p>
      </div>

      {/* Scanner Card */}
      <Card className="yusiop-card">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <QrCode className="h-10 w-10 text-primary" />
          </div>
          <CardTitle>Activar Tarjeta</CardTitle>
          <CardDescription>
            Usa la cámara o ingresa el código manualmente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Camera Scanner */}
          <div className="space-y-4">
            {scanning ? (
              <div className="space-y-4">
                <div className="relative">
                  <video
                    ref={videoRef}
                    className="w-full h-64 rounded-lg bg-muted object-cover"
                    playsInline
                    autoPlay
                    muted
                  />
                  <div className="absolute inset-0 border-2 border-primary rounded-lg opacity-50 pointer-events-none" />
                </div>
                <Button
                  onClick={stopScanning}
                  variant="outline"
                  className="w-full flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Detener Escaneo
                </Button>
              </div>
            ) : (
              <Button
                onClick={startScanning}
                className="w-full yusiop-button-primary flex items-center gap-2"
              >
                <Camera className="h-4 w-4" />
                Usar Cámara
              </Button>
            )}
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                O ingresa manualmente
              </span>
            </div>
          </div>

          {/* Manual Input */}
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <Input
              placeholder="Código de la tarjeta QR"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="yusiop-input"
            />
            <Button
              type="submit"
              className="w-full yusiop-button-secondary"
              disabled={!manualCode.trim() || activating}
            >
              {activating ? 'Activando...' : 'Activar Tarjeta'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="yusiop-card border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg text-primary">Tarjeta Estándar</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">5 Descargas</p>
            <p className="text-sm text-muted-foreground">
              Perfecto para descubrir nueva música
            </p>
          </CardContent>
        </Card>

        <Card className="yusiop-card border-secondary/20">
          <CardHeader>
            <CardTitle className="text-lg text-secondary">Tarjeta Premium</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">10 Descargas</p>
            <p className="text-sm text-muted-foreground">
              Para los verdaderos amantes de la música
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QRScanner;