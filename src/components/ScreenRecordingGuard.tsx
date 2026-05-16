import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { initScreenProtection, onScreenRecordingChange } from '@/lib/screenProtection';
import { usePlayerStore } from '@/stores/playerStore';

/**
 * Activa la protección nativa al montarse y, cuando se detecta grabación de
 * pantalla en iOS, pausa el reproductor y tapa la UI con un aviso opaco.
 * En Android no se renderiza nada porque FLAG_SECURE ya impide la captura.
 * En web/PWA el plugin no hace nada (silencioso).
 */
const ScreenRecordingGuard = () => {
  const [recording, setRecording] = useState(false);
  const pause = usePlayerStore((s) => s.pause);

  useEffect(() => {
    void initScreenProtection();

    let unsub: (() => void) | undefined;
    void onScreenRecordingChange((isRec) => {
      setRecording(isRec);
      if (isRec) pause();
    }).then((u) => { unsub = u; });

    return () => { unsub?.(); };
  }, [pause]);

  if (!recording) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4 bg-background p-8 text-center"
      role="alertdialog"
      aria-label="Grabación de pantalla bloqueada"
    >
      <ShieldAlert className="h-16 w-16 text-primary" />
      <h2 className="text-2xl font-bold">Grabación de pantalla detectada</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Por motivos de protección del catálogo musical, Yusiop pausa la
        reproducción y oculta la interfaz mientras estés grabando la pantalla.
        Detén la grabación para continuar escuchando.
      </p>
    </div>
  );
};

export default ScreenRecordingGuard;
