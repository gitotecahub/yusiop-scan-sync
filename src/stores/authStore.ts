import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialize: () => void;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: true,

  initialize: () => {
    // Configurar listener de cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session);
        set({
          session,
          user: session?.user ?? null,
          loading: false
        });
      }
    );

    // Obtener sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Current session:', session);
      set({
        session,
        user: session?.user ?? null,
        loading: false
      });
    });

    return () => subscription.unsubscribe();
  },

  signIn: async (email: string, password: string) => {
    set({ loading: true });
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    set({ loading: false });
    return { error };
  },

  signUp: async (email: string, password: string, username: string) => {
    set({ loading: true });
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          username
        }
      }
    });
    set({ loading: false });
    return { error };
  },

  signOut: async () => {
    console.log('Signing out...');
    set({ loading: true });
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('SignOut error:', error);
      } else {
        console.log('SignOut successful');
      }
    } catch (error) {
      console.error('SignOut exception:', error);
    }
    
    // Forzar limpieza del estado
    set({ 
      user: null, 
      session: null, 
      loading: false 
    });
  }
}));