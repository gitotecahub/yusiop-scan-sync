import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Smartphone, Share, Download } from 'lucide-react';

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Detectar iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // Detectar si ya está instalada
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsInstalled(isStandalone);

    // Listener para el evento de instalación
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/20 via-background to-accent/20">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="w-24 h-24 mx-auto bg-primary/20 rounded-full flex items-center justify-center">
            <Smartphone className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">¡Ya está instalada!</h1>
          <p className="text-muted-foreground">
            La aplicación ya está instalada en tu dispositivo. Puedes cerrar esta página.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/20 via-background to-accent/20">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-4">
          <div className="w-24 h-24 mx-auto bg-primary/20 rounded-full flex items-center justify-center">
            <Download className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Instalar Yusiop</h1>
          <p className="text-muted-foreground">
            Instala la aplicación en tu dispositivo para una mejor experiencia
          </p>
        </div>

        {isIOS ? (
          <div className="space-y-4 bg-card p-6 rounded-lg border">
            <h2 className="font-semibold flex items-center gap-2">
              <Share className="w-5 h-5" />
              Instrucciones para iOS
            </h2>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-bold text-primary">1.</span>
                <span>Toca el botón de compartir <Share className="w-4 h-4 inline" /> en la barra inferior</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-primary">2.</span>
                <span>Desplázate y selecciona "Añadir a pantalla de inicio"</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-primary">3.</span>
                <span>Toca "Añadir" en la esquina superior derecha</span>
              </li>
            </ol>
          </div>
        ) : isInstallable ? (
          <div className="space-y-4">
            <Button 
              onClick={handleInstallClick}
              className="w-full h-12 text-lg"
              size="lg"
            >
              <Download className="w-5 h-5 mr-2" />
              Instalar App
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              La aplicación se instalará en tu dispositivo y podrás acceder desde tu pantalla de inicio
            </p>
          </div>
        ) : (
          <div className="space-y-4 bg-card p-6 rounded-lg border">
            <h2 className="font-semibold flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Instrucciones para Android
            </h2>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-bold text-primary">1.</span>
                <span>Abre el menú del navegador (⋮)</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-primary">2.</span>
                <span>Selecciona "Instalar aplicación" o "Añadir a pantalla de inicio"</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-primary">3.</span>
                <span>Confirma la instalación</span>
              </li>
            </ol>
          </div>
        )}

        <div className="text-center">
          <a 
            href="/" 
            className="text-sm text-primary hover:underline"
          >
            Volver a la aplicación
          </a>
        </div>
      </div>
    </div>
  );
}
