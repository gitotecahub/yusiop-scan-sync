import { ReactNode, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

interface Props {
  children: ReactNode;
  /** Ruta a la que redirigir cuando se intenta acceder offline. Por defecto /library */
  fallback?: string;
  /** Mensaje toast a mostrar al redirigir */
  message?: string;
}

/**
 * Envuelve rutas que requieren red. Si el usuario está offline, redirige
 * a /library (Mi Biblioteca) y muestra un aviso.
 */
const OnlineOnlyRoute = ({
  children,
  fallback = '/library',
  message = 'Esta sección no está disponible sin conexión',
}: Props) => {
  const online = useOnlineStatus();

  useEffect(() => {
    if (!online) toast.info(message);
  }, [online, message]);

  if (!online) return <Navigate to={fallback} replace />;
  return <>{children}</>;
};

export default OnlineOnlyRoute;
