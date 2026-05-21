import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

export interface ArtistProfile {
  id: string;
  user_id: string;
  artist_code: string;
  artist_username: string;
  legal_name: string | null;
  stage_name: string;
  country: string | null;
  phone: string | null;
  phone_verified: boolean;
  email_verified: boolean;
  verification_status:
    | 'unverified'
    | 'basic_verified'
    | 'artist_verified'
    | 'under_review'
    | 'rejected'
    | 'suspended';
  official_links: string[];
  rejection_reason: string | null;
}

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30) || 'artist';

export const useArtistProfile = () => {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setProfile(null); setLoading(false); return; }
    setLoading(true);
    const { data } = await (supabase as any)
      .from('artist_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setProfile({ ...data, official_links: data.official_links || [] });
      setLoading(false);
      return;
    }

    // Auto-create from approved artist_request
    const { data: req } = await supabase
      .from('artist_requests')
      .select('artist_name')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .order('reviewed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const stage = req?.artist_name || (user.email?.split('@')[0] ?? 'artist');
    const base = slugify(stage);
    const username = `${base}_${Math.random().toString(36).slice(2, 6)}`;

    const { data: created, error } = await (supabase as any)
      .from('artist_profiles')
      .insert({
        user_id: user.id,
        stage_name: stage,
        artist_username: username,
        artist_code: '', // trigger fills it
        email_verified: !!user.email_confirmed_at,
      })
      .select('*')
      .single();

    if (!error && created) {
      setProfile({ ...created, official_links: created.official_links || [] });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  return { profile, loading, reload: load };
};
