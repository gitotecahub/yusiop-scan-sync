import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

export type AgeGroup = 'child' | 'teen' | 'adult' | null;

export interface AgeProfile {
  birthDate: string | null;
  ageGroup: AgeGroup;
  parentalEmail: string | null;
  parentalVerified: boolean;
  parentalVerificationToken: string | null;
}

const EMPTY: AgeProfile = {
  birthDate: null,
  ageGroup: null,
  parentalEmail: null,
  parentalVerified: false,
  parentalVerificationToken: null,
};

export function useAgeProfile() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<AgeProfile>(EMPTY);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setProfile(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('birth_date, age_group, parental_email, parental_verified, parental_verification_token')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) {
      setProfile({
        birthDate: (data as any).birth_date ?? null,
        ageGroup: ((data as any).age_group ?? null) as AgeGroup,
        parentalEmail: (data as any).parental_email ?? null,
        parentalVerified: !!(data as any).parental_verified,
        parentalVerificationToken: (data as any).parental_verification_token ?? null,
      });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const isAdult = profile.ageGroup === 'adult';
  const isTeen = profile.ageGroup === 'teen';
  const isChild = profile.ageGroup === 'child';
  const isMinor = isTeen || isChild;
  const needsBirthDate = !!user && !profile.birthDate && !loading;
  const canWithdraw = isAdult || (isTeen && profile.parentalVerified);
  const canUseApp = !isChild || profile.parentalVerified;

  return {
    profile,
    loading,
    isAdult,
    isTeen,
    isChild,
    isMinor,
    needsBirthDate,
    canWithdraw,
    canUseApp,
    reload: load,
  };
}
