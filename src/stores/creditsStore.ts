import { create } from 'zustand';

interface UserCredits {
  credits_remaining: number;
  card_type: string;
  expires_at: string;
  is_active: boolean;
}

interface CreditsState {
  userCredits: UserCredits | null;
  loading: boolean;
  setUserCredits: (credits: UserCredits | null) => void;
  decrementCredits: () => void;
  incrementCredits: () => void;
  setLoading: (loading: boolean) => void;
}

export const useCreditsStore = create<CreditsState>((set, get) => ({
  userCredits: null,
  loading: false,

  setUserCredits: (credits) => set({ userCredits: credits }),
  
  decrementCredits: () => {
    const { userCredits } = get();
    if (userCredits && userCredits.credits_remaining > 0) {
      set({
        userCredits: {
          ...userCredits,
          credits_remaining: userCredits.credits_remaining - 1
        }
      });
    }
  },

  setLoading: (loading) => set({ loading })
}));