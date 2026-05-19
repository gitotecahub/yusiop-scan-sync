// Auto-update del Service Worker.
//
// Estrategia: NO forzamos recarga de la página cuando hay una versión nueva,
// porque eso interrumpe al usuario (formularios a medias, subidas de archivos,
// envíos de música, etc.) y provoca el "splash screen aleatorio" que reinicia
// la app perdiendo el estado.
//
// En su lugar, registramos el SW para que se descargue e instale en segundo
// plano. La nueva versión tomará control en la siguiente navegación normal
// (cuando el usuario abra otra pestaña, cierre y vuelva, o recargue a mano).

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

    // Registrar SW sin auto-recarga. La actualización quedará "waiting" y
    // se activará la próxima vez que el usuario cargue la app de forma natural.
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        // No hacemos nada. La versión nueva queda lista para la próxima carga.
      },
      onOfflineReady() {
        // No-op
      },
    });

    // Comprobación periódica silenciosa cada 60 minutos para descargar nuevas
    // versiones en segundo plano (sin recargar nunca al usuario).
    const checkForUpdates = () => { void updateSW(); };
    setInterval(checkForUpdates, 60 * 60 * 1000);
  } catch (err) {
    console.warn('[sw-update] no se pudo inicializar:', err);
  }
};
