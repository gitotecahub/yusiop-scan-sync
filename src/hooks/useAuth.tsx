import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentSessionToken, setCurrentSessionToken] = useState<string | null>(null);

  const generateSessionToken = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const getDeviceInfo = () => {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      timestamp: new Date().toISOString()
    };
  };

  const manageUserSession = async (userEmail: string) => {
    try {
      const sessionToken = generateSessionToken();
      const deviceInfo = getDeviceInfo();

      console.log('Managing session for user:', userEmail);

      const { data, error } = await supabase.functions.invoke('manage-session', {
        body: {
          userEmail,
          sessionToken,
          deviceInfo
        }
      });

      if (error) {
        console.error('Error managing session:', error);
        toast.error('Error al gestionar la sesión');
        return null;
      }

      if (data?.previousSessionsDeactivated > 0) {
        toast.warning('Se cerró la sesión en otro dispositivo para mantener la seguridad');
      }

      setCurrentSessionToken(sessionToken);
      return sessionToken;
    } catch (error) {
      console.error('Error in session management:', error);
      toast.error('Error al gestionar la sesión');
      return null;
    }
  };

  const checkSessionValidity = async (userEmail: string, sessionToken: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('check-session', {
        body: {
          userEmail,
          sessionToken
        }
      });

      if (error) {
        console.error('Error checking session:', error);
        return false;
      }

      return data?.isValid || false;
    } catch (error) {
      console.error('Error checking session validity:', error);
      return false;
    }
  };

  const checkAdminRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .single();
      
      return !error && data?.role === 'admin';
    } catch (error) {
      console.error('Error checking admin role:', error);
      return false;
    }
  };

  // Check session validity periodically
  useEffect(() => {
    if (!user || !currentSessionToken) return;

    const interval = setInterval(async () => {
      const isValid = await checkSessionValidity(user.email!, currentSessionToken);
      if (!isValid) {
        toast.error('Tu sesión ha sido cerrada. Alguien más accedió a tu cuenta.');
        await supabase.auth.signOut();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [user, currentSessionToken]);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user && event === 'SIGNED_IN') {
          // Manage session when user signs in
          await manageUserSession(session.user.email!);
          setTimeout(async () => {
            const adminStatus = await checkAdminRole(session.user.id);
            setIsAdmin(adminStatus);
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          setIsAdmin(false);
          setCurrentSessionToken(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(async () => {
          await manageUserSession(session.user.email!);
          const adminStatus = await checkAdminRole(session.user.id);
          setIsAdmin(adminStatus);
        }, 0);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    return { error };
  };

  const signOut = async () => {
    // Deactivate current session
    if (user && currentSessionToken) {
      try {
        await supabase
          .from('user_sessions')
          .update({ is_active: false })
          .eq('user_email', user.email!)
          .eq('session_token', currentSessionToken);
      } catch (error) {
        console.error('Error deactivating session on logout:', error);
      }
    }
    
    setCurrentSessionToken(null);
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    isAdmin,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};