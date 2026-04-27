import { useEffect, useState } from 'react';

/**
 * Hook reactivo al estado de conexión del navegador.
 * Devuelve true si el navegador reporta conexión, false si está offline.
 */
export const useOnlineStatus = (): boolean => {
  const [online, setOnline] = useState<boolean>(() => {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine;
  });

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return online;
};
