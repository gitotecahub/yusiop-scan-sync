import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

/**
 * Gestiona el follow/unfollow de un artista por el usuario actual.
 * Persiste en user_artist_follows (RLS scoped a auth.uid()).
 */
export function useArtistFollow(artistId: string | null | undefined) {
  const user = useAuthStore((s) => s.user);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id || !artistId) { setFollowing(false); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('user_artist_follows')
        .select('artist_id')
        .eq('user_id', user.id)
        .eq('artist_id', artistId)
        .maybeSingle();
      if (!cancelled) setFollowing(!!data);
    })();
    return () => { cancelled = true; };
  }, [user?.id, artistId]);

  const toggle = useCallback(async () => {
    if (!user?.id) {
      toast.error('Inicia sesión para seguir artistas');
      return;
    }
    if (!artistId) return;
    setLoading(true);
    try {
      if (following) {
        const { error } = await supabase
          .from('user_artist_follows')
          .delete()
          .eq('user_id', user.id)
          .eq('artist_id', artistId);
        if (error) throw error;
        setFollowing(false);
      } else {
        const { error } = await supabase
          .from('user_artist_follows')
          .insert({ user_id: user.id, artist_id: artistId });
        if (error) throw error;
        setFollowing(true);
        toast.success('Siguiendo al artista');
      }
    } catch (e: any) {
      toast.error(e.message || 'No se pudo actualizar');
    } finally {
      setLoading(false);
    }
  }, [following, user?.id, artistId]);

  return { following, loading, toggle };
}
