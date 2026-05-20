// Auto-update del Service Worker en tiempo real.
//
// Estrategia: cuando se publica una versión nueva, descargamos el SW en
// segundo plano y, en cuanto está listo, mostramos un toast persistente
// "Nueva versión disponible — Actualizar". Al pulsar, activamos el SW
// nuevo (skipWaiting) y recargamos la app para aplicar los cambios al
// instante, igual que ocurre en el editor.
//
// Comprobaciones:
//  - Al cargar la app (immediate: true)
//  - Cada 5 minutos en segundo plano
//  - Cuando la pestaña vuelve a primer plano (visibilitychange)
//  - Cuando el navegador recupera conexión

import { toast } from 'sonner';

export const initSwAutoUpdate = async () => {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  const hostname = window.location.hostname;
  const isInIframe = (() => {
    try { return window.self !== window.top; } catch { return true; }
  })();
  const isPreviewEnvironment =
    hostname.includes('preview--') ||
    hostname.includes('lovableproject.com') ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    isInIframe;
  if (isPreviewEnvironment) return;

  try {
    const { registerSW } = await import('virtual:pwa-register');

    let toastShown = false;

    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        if (toastShown) return;
        toastShown = true;
        toast('Nueva versión disponible', {
          description: 'Hay una actualización lista. Pulsa para aplicarla.',
          duration: Infinity,
          action: {
            label: 'Actualizar',
            onClick: () => {
              // Activa el SW en espera y recarga la app con la nueva versión.
              void updateSW(true);
            },
          },
        });
      },
      onOfflineReady() {
        // No-op
      },
      onRegisteredSW(_swUrl, registration) {
        if (!registration) return;

        const check = () => { void registration.update().catch(() => {}); };

        // Comprobación periódica cada 5 minutos.
        setInterval(check, 5 * 60 * 1000);

        // Comprobar cuando la pestaña vuelve a estar visible.
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') check();
        });

        // Comprobar al recuperar conexión.
        window.addEventListener('online', check);
      },
    });
  } catch (err) {
    console.warn('[sw-update] no se pudo inicializar:', err);
  }
};
