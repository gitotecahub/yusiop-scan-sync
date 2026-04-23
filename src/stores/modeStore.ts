import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

export type AppMode = 'user' | 'artist';

interface ModeState {
  mode: AppMode;
  isArtist: boolean;
  artistRequestStatus: 'none' | 'pending' | 'approved' | 'rejected';
  profileChoiceMade: boolean;
  loading: boolean;
  loadForUser: (userId: string) => Promise<void>;
  setMode: (userId: string, mode: AppMode) => Promise<void>;
  markChoiceMade: (userId: string, mode: AppMode) => Promise<void>;
  reset: () => void;
}

export const useModeStore = create<ModeState>((set, get) => ({
  mode: 'user',
  isArtist: false,
  artistRequestStatus: 'none',
  profileChoiceMade: false,
  loading: true,

  loadForUser: async (userId: string) => {
    set({ loading: true });
    try {
      const [profileRes, rolesRes, requestRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('profile_choice_made, preferred_mode, last_used_mode')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId),
        supabase
          .from('artist_requests')
          .select('status, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const profile = profileRes.data;
      const roles = (rolesRes.data ?? []).map((r) => r.role);
      const isArtist = roles.includes('artist');
      const lastUsed = (profile?.last_used_mode as AppMode) || 'user';
      // Si no es artista, fuerza modo user
      const mode: AppMode = isArtist ? lastUsed : 'user';

      let status: ModeState['artistRequestStatus'] = 'none';
      if (requestRes.data?.status) {
        status = requestRes.data.status as ModeState['artistRequestStatus'];
      }

      set({
        isArtist,
        mode,
        artistRequestStatus: status,
        profileChoiceMade: profile?.profile_choice_made ?? false,
        loading: false,
      });
    } catch (e) {
      console.error('[modeStore] loadForUser failed', e);
      set({ loading: false });
    }
  },

  setMode: async (userId: string, mode: AppMode) => {
    set({ mode });
    try {
      await supabase
        .from('profiles')
        .update({ last_used_mode: mode, preferred_mode: mode })
        .eq('user_id', userId);
    } catch (e) {
      console.error('[modeStore] setMode failed', e);
    }
  },

  markChoiceMade: async (userId: string, mode: AppMode) => {
    set({ profileChoiceMade: true, mode });
    try {
      await supabase
        .from('profiles')
        .update({
          profile_choice_made: true,
          preferred_mode: mode,
          last_used_mode: mode,
        })
        .eq('user_id', userId);
    } catch (e) {
      console.error('[modeStore] markChoiceMade failed', e);
    }
  },

  reset: () =>
    set({
      mode: 'user',
      isArtist: false,
      artistRequestStatus: 'none',
      profileChoiceMade: false,
      loading: true,
    }),
}));
