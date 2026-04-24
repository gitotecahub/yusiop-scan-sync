import { useEffect, useRef, useState } from 'react';

/**
 * Hook que detecta capacidades de cast (Chromecast, AirPlay, Remote Playback,
 * Presentation API) y mantiene un estado reactivo con la disponibilidad y
 * conexión actual.
 *
 * Carga el SDK oficial de Google Cast bajo demanda. Si no se puede cargar
 * (bloqueado por la red, navegador no compatible) se cae a la API genérica
 * Remote Playback y a la Presentation API.
 */

declare global {
  interface Window {
    __onGCastApiAvailable?: (isAvailable: boolean) => void;
    cast?: any;
    chrome?: any;
  }
}

export type CastState = 'unavailable' | 'available' | 'connecting' | 'connected';

let castSdkLoaded = false;
let castSdkLoading: Promise<boolean> | null = null;

const loadCastSdk = (): Promise<boolean> => {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (castSdkLoaded && window.cast?.framework) return Promise.resolve(true);
  if (castSdkLoading) return castSdkLoading;

  castSdkLoading = new Promise<boolean>((resolve) => {
    // Si ya está cargado por otro consumidor
    if (window.cast?.framework) {
      castSdkLoaded = true;
      resolve(true);
      return;
    }

    const SCRIPT_ID = 'google-cast-sdk';
    const existing = document.getElementById(SCRIPT_ID);
    const ready = () => {
      castSdkLoaded = true;
      resolve(true);
    };
    window.__onGCastApiAvailable = (isAvailable: boolean) => {
      if (isAvailable) ready();
      else resolve(false);
    };
    if (!existing) {
      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
      script.async = true;
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    }
    // Timeout defensivo
    setTimeout(() => resolve(!!window.cast?.framework), 6000);
  });

  return castSdkLoading;
};

export const useCastDevices = (audioElGetter?: () => HTMLAudioElement | null) => {
  const [state, setState] = useState<CastState>('unavailable');
  const [supportsAirPlay, setSupportsAirPlay] = useState(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const contextRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    const initCast = async () => {
      const ok = await loadCastSdk();
      if (cancelled || !ok || !window.cast?.framework) return;

      try {
        const ctx = window.cast.framework.CastContext.getInstance();
        ctx.setOptions({
          receiverApplicationId: window.chrome?.cast?.media?.DEFAULT_MEDIA_RECEIVER_APP_ID || 'CC1AD845',
          autoJoinPolicy: window.chrome?.cast?.AutoJoinPolicy?.ORIGIN_SCOPED || 'origin_scoped',
        });
        contextRef.current = ctx;

        const mapState = (s: string): CastState => {
          switch (s) {
            case 'NO_DEVICES_AVAILABLE': return 'unavailable';
            case 'NOT_CONNECTED': return 'available';
            case 'CONNECTING': return 'connecting';
            case 'CONNECTED': return 'connected';
            default: return 'unavailable';
          }
        };

        const onState = (ev: any) => {
          const next = mapState(ev.castState);
          setState(next);
          const session = ctx.getCurrentSession?.();
          setDeviceName(session?.getCastDevice?.().friendlyName ?? null);
        };
        ctx.addEventListener(
          window.cast.framework.CastContextEventType.CAST_STATE_CHANGED,
          onState,
        );
        // Estado inicial
        onState({ castState: ctx.getCastState() });
      } catch (e) {
        console.warn('Cast SDK init failed', e);
      }
    };

    // Detección AirPlay (Safari/iOS)
    const audio = audioElGetter?.() ?? (document.querySelector('audio') as HTMLAudioElement | null);
    const onAirPlayAvail = (e: any) => {
      if (e.availability === 'available') {
        setSupportsAirPlay(true);
        setState((s) => (s === 'unavailable' ? 'available' : s));
      }
    };
    if (audio && 'WebKitPlaybackTargetAvailabilityEvent' in window) {
      audio.addEventListener('webkitplaybacktargetavailabilitychanged', onAirPlayAvail as any);
      audio.addEventListener('webkitcurrentplaybacktargetiswirelesschanged', () => {
        const wireless = (audio as any).webkitCurrentPlaybackTargetIsWireless;
        setState(wireless ? 'connected' : (supportsAirPlay ? 'available' : 'unavailable'));
      });
    }

    // Remote Playback API (Chrome desktop con Cast disponible, navegadores compatibles)
    const remote: any = (audio as any)?.remote;
    if (remote && typeof remote.watchAvailability === 'function') {
      remote
        .watchAvailability((available: boolean) => {
          if (available) setState((s) => (s === 'unavailable' ? 'available' : s));
        })
        .catch(() => {/* ignore */});
      remote.addEventListener?.('connect', () => setState('connected'));
      remote.addEventListener?.('connecting', () => setState('connecting'));
      remote.addEventListener?.('disconnect', () => setState('available'));
    }

    initCast();

    return () => {
      cancelled = true;
      if (audio) {
        audio.removeEventListener('webkitplaybacktargetavailabilitychanged', onAirPlayAvail as any);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Abre el selector nativo de dispositivos. Devuelve true si se inició el flujo. */
  const requestSession = async (mediaUrl?: string, meta?: { title?: string; artist?: string; cover?: string }): Promise<boolean> => {
    // 1) Google Cast SDK
    const ctx = contextRef.current;
    if (ctx && window.cast?.framework) {
      try {
        await ctx.requestSession();
        const session = ctx.getCurrentSession?.();
        if (session && mediaUrl && window.chrome?.cast?.media) {
          const mediaInfo = new window.chrome.cast.media.MediaInfo(mediaUrl, 'audio/mpeg');
          mediaInfo.metadata = new window.chrome.cast.media.MusicTrackMediaMetadata();
          mediaInfo.metadata.title = meta?.title ?? '';
          mediaInfo.metadata.artist = meta?.artist ?? '';
          if (meta?.cover) mediaInfo.metadata.images = [{ url: meta.cover }];
          const request = new window.chrome.cast.media.LoadRequest(mediaInfo);
          await session.loadMedia(request);
        }
        return true;
      } catch (err: any) {
        if (err === 'cancel' || err?.code === 'cancel') return false;
        console.warn('Cast requestSession failed', err);
      }
    }

    // 2) AirPlay (Safari)
    const audio = audioElGetter?.() ?? (document.querySelector('audio') as any);
    if (audio?.webkitShowPlaybackTargetPicker) {
      audio.webkitShowPlaybackTargetPicker();
      return true;
    }

    // 3) Remote Playback API
    if (audio?.remote?.prompt) {
      try {
        await audio.remote.prompt();
        return true;
      } catch { /* ignore */ }
    }

    // 4) Presentation API (segunda pantalla)
    const w = window as any;
    if (w.PresentationRequest && mediaUrl) {
      try {
        const req = new w.PresentationRequest([mediaUrl]);
        await req.start();
        return true;
      } catch { /* ignore */ }
    }

    return false;
  };

  /** Termina la sesión de cast actual */
  const endSession = () => {
    const ctx = contextRef.current;
    try {
      ctx?.endCurrentSession?.(true);
    } catch { /* ignore */ }
  };

  return { state, deviceName, supportsAirPlay, requestSession, endSession };
};
