// Auto-update del Service Worker.
// Cuando hay una versión nueva publicada, recarga la app automáticamente
// para que el usuario vea los cambios sin tener que hacer hard reload.
//
// Solo se ejecuta en entornos de producción (no en el preview de Lovable
// ni en iframes), porque main.tsx ya desregistra el SW en esos casos.

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

    let reloading = false;
    const reloadOnce = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };

    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        // Hay un SW nuevo esperando: refrescamos para activarlo.
        void updateSW(true).then(() => reloadOnce());
        // Fallback: si el evento controllerchange no llega, recargar de todos modos.
        setTimeout(reloadOnce, 1500);
      },
      onOfflineReady() {
        // No-op
      },
    });

    // Cuando el SW activo cambia (nueva versión toma control), recargar.
    navigator.serviceWorker.addEventListener('controllerchange', reloadOnce);

    // Comprobar actualizaciones al volver a la pestaña / recuperar conexión.
    const checkForUpdates = () => { void updateSW(); };
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkForUpdates();
    });
    window.addEventListener('focus', checkForUpdates);
    window.addEventListener('online', checkForUpdates);

    // Comprobación periódica cada 30 minutos por si la pestaña queda abierta.
    setInterval(checkForUpdates, 30 * 60 * 1000);
  } catch (err) {
    console.warn('[sw-update] no se pudo inicializar:', err);
  }
};
