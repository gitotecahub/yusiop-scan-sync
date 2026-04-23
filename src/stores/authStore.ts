import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  claimActiveSession,
  subscribeActiveSession,
  checkActiveSession,
} from '@/lib/singleDevice';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialize: () => void;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

let unsubscribeDeviceWatcher: (() => void) | null = null;

const evictCurrentSession = async (set: (partial: Partial<AuthState>) => void) => {
  if (unsubscribeDeviceWatcher) {
    unsubscribeDeviceWatcher();
    unsubscribeDeviceWatcher = null;
  }
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

const startDeviceWatch = (
  userId: string,
  set: (partial: Partial<AuthState>) => void,
) => {
  if (unsubscribeDeviceWatcher) unsubscribeDeviceWatcher();
  unsubscribeDeviceWatcher = subscribeActiveSession(userId, () => {
    void evictCurrentSession(set);
  });
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
          // Reclamar dispositivo y empezar a vigilar (deferimos para no bloquear el callback)
          setTimeout(async () => {
            await claimActiveSession(session.user.id);
            startDeviceWatch(session.user.id, set);
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          if (unsubscribeDeviceWatcher) {
            unsubscribeDeviceWatcher();
            unsubscribeDeviceWatcher = null;
          }
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
        // Verificar que seguimos siendo el dispositivo activo
        const { isCurrent } = await checkActiveSession(session.user.id);
        if (!isCurrent) {
          await evictCurrentSession(set);
          return;
        }
        startDeviceWatch(session.user.id, set);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (unsubscribeDeviceWatcher) {
        unsubscribeDeviceWatcher();
        unsubscribeDeviceWatcher = null;
      }
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

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { username },
      },
    });
    set({ loading: false });
    return { error };
  },

  signInWithGoogle: async () => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl },
    });
    return { error };
  },

  signOut: async () => {
    set({ loading: true });
    if (unsubscribeDeviceWatcher) {
      unsubscribeDeviceWatcher();
      unsubscribeDeviceWatcher = null;
    }

    try {
      await supabase.auth.signOut();
    } catch {
      // Silenciar; siempre limpiamos el estado local debajo
    }

    set({ user: null, session: null, loading: false });
  },
}));
