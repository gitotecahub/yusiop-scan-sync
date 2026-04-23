import { useState, useEffect } from 'react';
import { Monitor, X, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const STORAGE_KEY = 'yusiop:artist:desktop-notice-dismissed';

/**
 * Aviso para artistas: les recuerda que también pueden subir música
 * desde el ordenador. Solo visible en móvil/tablet pequeño y descartable.
 */
const DesktopUploadNotice = () => {
  const [dismissed, setDismissed] = useState(true);
  const [copied, setCopied] = useState(false);

  // URL pública donde el artista puede acceder desde el ordenador.
  // Usa el origen actual: cuando publiquen la app, será el dominio correcto.
  const desktopUrl = `${window.location.origin}/artist`;

  useEffect(() => {
    setDismissed(localStorage.getItem(STORAGE_KEY) === '1');
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setDismissed(true);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(desktopUrl);
      setCopied(true);
      toast.success('Enlace copiado');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar el enlace');
    }
  };

  if (dismissed) return null;

  return (
    <div className="lg:hidden relative rounded-2xl border border-primary/30 bg-primary/5 p-4 mb-4">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded-md hover:bg-primary/10 transition-colors"
        aria-label="Descartar aviso"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>

      <div className="flex gap-3 pr-6">
        <div className="shrink-0 h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
          <Monitor className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-sm">
            ¿Prefieres subir música desde el ordenador?
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Accede a tu panel de artista desde cualquier navegador para gestionar
            archivos grandes con más comodidad.
          </p>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <code className="text-xs bg-background/60 border border-border/60 rounded-md px-2 py-1 truncate max-w-full">
              {desktopUrl}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              className="h-7 rounded-lg text-xs"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 mr-1" /> Copiado
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" /> Copiar
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesktopUploadNotice;
