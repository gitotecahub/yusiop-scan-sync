import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

/**
 * Banner fijo en la parte superior cuando el dispositivo está sin conexión.
 * Solo se muestra cuando navigator.onLine === false.
 */
const OfflineBanner = () => {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 inset-x-0 z-[60] pointer-events-none flex justify-center px-3 pt-[max(env(safe-area-inset-top),0.5rem)]"
    >
      <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-foreground/90 text-background backdrop-blur-md shadow-lg px-4 py-1.5 text-xs font-semibold">
        <WifiOff className="h-3.5 w-3.5" />
        <span>Estás sin conexión · Solo Mi Biblioteca disponible</span>
      </div>
    </div>
  );
};

export default OfflineBanner;
