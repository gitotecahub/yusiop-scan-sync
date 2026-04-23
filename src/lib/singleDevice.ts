import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

const DEVICE_ID_KEY = 'yusiop_device_id';

/** Devuelve (y persiste) un identificador único para este dispositivo/navegador. */
export const getDeviceId = (): string => {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `dev_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
};

const getDeviceInfo = () => ({
  userAgent: navigator.userAgent,
  platform: navigator.platform,
  language: navigator.language,
  ts: new Date().toISOString(),
});

/**
 * Marca este dispositivo como el único activo para el usuario.
 * Cualquier otra sesión del mismo usuario verá el cambio vía Realtime y se cerrará.
 */
export const claimActiveSession = async (userId: string): Promise<void> => {
  const deviceId = getDeviceId();
  const { error } = await supabase
    .from('active_sessions')
    .upsert(
      {
        user_id: userId,
        device_id: deviceId,
        device_info: getDeviceInfo(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
  if (error) console.error('claimActiveSession error', error);
};

let channel: RealtimeChannel | null = null;

/**
 * Suscribe a cambios sobre la sesión activa del usuario. Si otro dispositivo
 * reclama la sesión (device_id distinto al nuestro), llama a `onEvicted`.
 */
export const subscribeActiveSession = (
  userId: string,
  onEvicted: () => void,
): (() => void) => {
  const ourDeviceId = getDeviceId();

  // Cerrar canal anterior si existe
  if (channel) {
    supabase.removeChannel(channel);
    channel = null;
  }

  channel = supabase
    .channel(`active-session-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'active_sessions',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const newRow = (payload.new ?? {}) as { device_id?: string };
        if (newRow.device_id && newRow.device_id !== ourDeviceId) {
          onEvicted();
        }
      },
    )
    .subscribe();

  return () => {
    if (channel) {
      supabase.removeChannel(channel);
      channel = null;
    }
  };
};

/**
 * Verificación puntual (al iniciar la app o recuperar foco) por si la sesión
 * activa cambió mientras este cliente estaba offline.
 */
export const checkActiveSession = async (
  userId: string,
): Promise<{ isCurrent: boolean }> => {
  const ourDeviceId = getDeviceId();
  const { data, error } = await supabase
    .from('active_sessions')
    .select('device_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.warn('checkActiveSession error', error);
    return { isCurrent: true };
  }
  if (!data) return { isCurrent: true };
  return { isCurrent: data.device_id === ourDeviceId };
};
