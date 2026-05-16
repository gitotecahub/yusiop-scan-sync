// Activa la protección anti-captura/grabación en builds nativas.
// - Android: FLAG_SECURE (la grabación captura una pantalla negra)
// - iOS: Apple no permite bloquear la grabación, pero el plugin oculta la
//   vista previa en multitarea y emite eventos cuando se inicia/detiene una
//   grabación de pantalla. Los aprovechamos para tapar la UI y silenciar
//   el reproductor (ver ScreenRecordingGuard).
//
// En web/PWA no hay API equivalente; la única defensa práctica es la marca
// de agua disuasoria con el email del usuario (WatermarkOverlay).

import { Capacitor } from '@capacitor/core';

let initialized = false;

export const initScreenProtection = async () => {
  if (initialized) return;
  initialized = true;

  if (!Capacitor.isNativePlatform()) return;

  try {
    const mod: any = await import('@capacitor-community/privacy-screen');
    const PrivacyScreen = mod.PrivacyScreen;
    if (!PrivacyScreen) return;

    await PrivacyScreen.enable({
      android: { enabled: true },
      ios: {
        enabled: true,
        // Detecta grabación de pantalla activa
        privacyModeOnScreenRecord: 'blur',
      },
    });
  } catch (err) {
    console.warn('[screen-protection] init failed', err);
  }
};

/**
 * Suscribe callbacks a los eventos de grabación de pantalla en iOS.
 * En Android no se dispara: FLAG_SECURE ya bloquea la captura a nivel SO.
 */
export const onScreenRecordingChange = async (
  cb: (recording: boolean) => void,
): Promise<() => void> => {
  if (!Capacitor.isNativePlatform()) return () => {};

  try {
    const mod: any = await import('@capacitor-community/privacy-screen');
    const PrivacyScreen = mod.PrivacyScreen;
    if (!PrivacyScreen?.addListener) return () => {};

    const started = await PrivacyScreen.addListener('screenRecordingStarted', () => cb(true));
    const stopped = await PrivacyScreen.addListener('screenRecordingStopped', () => cb(false));

    return () => {
      try { started?.remove?.(); } catch {}
      try { stopped?.remove?.(); } catch {}
    };
  } catch {
    return () => {};
  }
};
