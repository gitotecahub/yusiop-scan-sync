import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { QrCode, Camera, X } from 'lucide-react';
import { toast } from 'sonner';
import QrScanner from 'qr-scanner';

const QRScanner = () => {
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);

  const activateQRCode = async (code: string) => {
    try {
      // Aquí llamaremos a la edge function para activar el QR
      toast.success(`QR activado: ${code}`);
      stopScanning();
    } catch (error) {
      toast.error('Error al activar el QR');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      activateQRCode(manualCode.trim());
      setManualCode('');
    }
  };

  const stopScanning = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
    setScanning(false);
  };

  const startScanning = async () => {
    try {
      setScanning(true);
      
      if (!videoRef.current) {
        toast.error('Error al inicializar la cámara');
        setScanning(false);
        return;
      }

      // Crear instancia del scanner
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          activateQRCode(result.data);
        },
        {
          returnDetailedScanResult: true,
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      );

      await qrScannerRef.current.start();
      toast.success('Cámara activada. Apunta al código QR');
    } catch (error) {
      console.error('Error al iniciar el scanner:', error);
      toast.error('Error al acceder a la cámara. Verifica los permisos.');
      setScanning(false);
    }
  };

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

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
              disabled={!manualCode.trim()}
            >
              Activar Tarjeta
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