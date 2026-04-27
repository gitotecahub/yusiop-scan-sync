import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  claimActiveSession,
  subscribeActiveSession,
  checkActiveSession,
  getDeviceId,
} from '@/lib/singleDevice';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialize: () => void;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: any; alreadyRegistered?: boolean }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

let unsubscribeDeviceWatcher: (() => void) | null = null;
let focusListener: (() => void) | null = null;
let visibilityListener: (() => void) | null = null;
let onlineListener: (() => void) | null = null;
let pollInterval: number | null = null;
let currentWatchedUserId: string | null = null;

const evictCurrentSession = async (set: (partial: Partial<AuthState>) => void) => {
  console.warn('[single-device] Sesión expulsada por otro dispositivo');
  stopDeviceWatch();
  try {
    await supabase.auth.signOut();
  } catch {
    // noop
  }
  set({ user: null, session: null, loading: false });
  toast.error('Sesión cerrada: se inició sesión en otro dispositivo', {
    duration: 6000,
  });
};

const stopDeviceWatch = () => {
  if (unsubscribeDeviceWatcher) {
    unsubscribeDeviceWatcher();
    unsubscribeDeviceWatcher = null;
  }
  if (focusListener) {
    window.removeEventListener('focus', focusListener);
    focusListener = null;
  }
  if (visibilityListener) {
    document.removeEventListener('visibilitychange', visibilityListener);
    visibilityListener = null;
  }
  if (onlineListener) {
    window.removeEventListener('online', onlineListener);
    onlineListener = null;
  }
  if (pollInterval !== null) {
    window.clearInterval(pollInterval);
    pollInterval = null;
  }
  currentWatchedUserId = null;
};

const verifyOrEvict = async (
  userId: string,
  set: (partial: Partial<AuthState>) => void,
) => {
  try {
    const { isCurrent } = await checkActiveSession(userId);
    console.log('[single-device] verify', {
      userId,
      ourDeviceId: getDeviceId(),
      isCurrent,
    });
    if (!isCurrent) await evictCurrentSession(set);
  } catch (e) {
    console.warn('[single-device] verify failed', e);
  }
};

const startDeviceWatch = (
  userId: string,
  set: (partial: Partial<AuthState>) => void,
) => {
  stopDeviceWatch();
  currentWatchedUserId = userId;

  console.log('[single-device] watch start', {
    userId,
    deviceId: getDeviceId(),
  });

  // Realtime: notificación instantánea
  unsubscribeDeviceWatcher = subscribeActiveSession(userId, () => {
    void evictCurrentSession(set);
  });

  // Fallback: verificar al recibir foco / volver visible / online
  focusListener = () => verifyOrEvict(userId, set);
  visibilityListener = () => {
    if (document.visibilityState === 'visible') verifyOrEvict(userId, set);
  };
  onlineListener = () => verifyOrEvict(userId, set);
  window.addEventListener('focus', focusListener);
  document.addEventListener('visibilitychange', visibilityListener);
  window.addEventListener('online', onlineListener);

  // Poll cada 30s como red de seguridad si Realtime cae
  pollInterval = window.setInterval(() => {
    if (currentWatchedUserId) verifyOrEvict(currentWatchedUserId, set);
  }, 30_000);
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: true,

  initialize: () => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        set({
          session,
          user: session?.user ?? null,
          loading: false,
        });

        if (event === 'SIGNED_IN' && session?.user) {
          // Reclamar dispositivo y empezar a vigilar
          setTimeout(async () => {
            await claimActiveSession(session.user.id);
            startDeviceWatch(session.user.id, set);
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          stopDeviceWatch();
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Verificar tras refresh por si nos expulsaron mientras estábamos offline
          void verifyOrEvict(session.user.id, set);
        }
      },
    );

    // Sesión existente al cargar la app
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      set({
        session,
        user: session?.user ?? null,
        loading: false,
      });

      if (session?.user) {
        const { isCurrent } = await checkActiveSession(session.user.id);
        console.log('[single-device] init check', {
          userId: session.user.id,
          deviceId: getDeviceId(),
          isCurrent,
        });
        if (!isCurrent) {
          // Otro dispositivo es el activo; no reclamar — expulsar este
          await evictCurrentSession(set);
          return;
        }
        // Si no había registro, reclamarlo ahora
        await claimActiveSession(session.user.id);
        startDeviceWatch(session.user.id, set);
      }
    });

    return () => {
      subscription.unsubscribe();
      stopDeviceWatch();
    };
  },

  signIn: async (email: string, password: string) => {
    set({ loading: true });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    set({ loading: false });
    return { error };
  },

  signUp: async (email: string, password: string, username: string) => {
    set({ loading: true });
    const redirectUrl = `${window.location.origin}/auth`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { username },
      },
    });
    set({ loading: false });

    // Supabase returns 200 OK with a "fake" user (no identities) when the
    // email is already registered, to avoid leaking account existence.
    // Detect this case so the UI can surface a clear message.
    const alreadyRegistered =
      !error &&
      !!data?.user &&
      Array.isArray((data.user as any).identities) &&
      (data.user as any).identities.length === 0;

    return { error, alreadyRegistered };
  },

  signInWithGoogle: async () => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl },
    });
    return { error };
  },

  resetPassword: async (email: string) => {
    const redirectUrl = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error };
  },

  updatePassword: async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error };
  },

  signOut: async () => {
    set({ loading: true });
    stopDeviceWatch();

    try {
      // Borrar nuestro registro para que el siguiente inicio sea limpio
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        await supabase.from('active_sessions').delete().eq('user_id', user.id);
      }
    } catch {
      // noop
    }

    try {
      await supabase.auth.signOut();
    } catch {
      // noop
    }

    set({ user: null, session: null, loading: false });
  },
}));
