import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

export interface FriendProfile {
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  created_at: string;
  profile?: FriendProfile | null;
}

export const useFriends = () => {
  const { user } = useAuthStore();
  const userId = user?.id;
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const loadProfilesByIds = async (ids: string[]) => {
    if (ids.length === 0) return new Map<string, FriendProfile>();
    const { data } = await supabase
      .from('profiles')
      .select('user_id, username, full_name, avatar_url')
      .in('user_id', ids);
    const map = new Map<string, FriendProfile>();
    (data || []).forEach((p: any) => map.set(p.user_id, p));
    return map;
  };

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // Friends
      const { data: friendRows } = await supabase
        .from('friends')
        .select('friend_id')
        .eq('user_id', userId);
      const fIds = (friendRows || []).map((r: any) => r.friend_id);
      const fMap = await loadProfilesByIds(fIds);
      setFriends(fIds.map((id) => fMap.get(id)).filter(Boolean) as FriendProfile[]);

      // Incoming requests
      const { data: inRows } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('receiver_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      const inIds = (inRows || []).map((r: any) => r.sender_id);
      const inMap = await loadProfilesByIds(inIds);
      setIncoming((inRows || []).map((r: any) => ({ ...r, profile: inMap.get(r.sender_id) || null })));

      // Outgoing requests
      const { data: outRows } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('sender_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      const outIds = (outRows || []).map((r: any) => r.receiver_id);
      const outMap = await loadProfilesByIds(outIds);
      setOutgoing((outRows || []).map((r: any) => ({ ...r, profile: outMap.get(r.receiver_id) || null })));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`friends-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friends' }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  const sendRequest = async (receiverId: string) => {
    if (!userId) return { error: 'No auth' };
    const { error } = await supabase.from('friend_requests').insert({
      sender_id: userId,
      receiver_id: receiverId,
    });
    if (!error) await refresh();
    return { error: error?.message || null };
  };

  const acceptRequest = async (requestId: string) => {
    const { error } = await supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);
    if (!error) await refresh();
    return { error: error?.message || null };
  };

  const rejectRequest = async (requestId: string) => {
    const { error } = await supabase
      .from('friend_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);
    if (!error) await refresh();
    return { error: error?.message || null };
  };

  const cancelRequest = async (requestId: string) => {
    const { error } = await supabase.from('friend_requests').delete().eq('id', requestId);
    if (!error) await refresh();
    return { error: error?.message || null };
  };

  const removeFriend = async (friendUserId: string) => {
    if (!userId) return { error: 'No auth' };
    const { error } = await supabase
      .from('friends')
      .delete()
      .eq('user_id', userId)
      .eq('friend_id', friendUserId);
    if (!error) await refresh();
    return { error: error?.message || null };
  };

  const searchUsers = async (query: string): Promise<FriendProfile[]> => {
    if (!query || query.trim().length < 2) return [];
    const { data, error } = await supabase.rpc('search_users_for_friends', { _query: query.trim() });
    if (error) return [];
    return (data as any[]) as FriendProfile[];
  };

  const shareItem = async (
    friendIds: string[],
    itemType: 'song' | 'artist' | 'digital_card',
    itemId: string,
    message?: string
  ) => {
    if (!userId || friendIds.length === 0) return { error: 'No data' };
    const rows = friendIds.map((fid) => ({
      sender_id: userId,
      receiver_id: fid,
      item_type: itemType,
      item_id: itemId,
      message: message || null,
    }));
    const { error } = await supabase.from('shared_items').insert(rows);
    return { error: error?.message || null };
  };

  return {
    friends,
    incoming,
    outgoing,
    loading,
    refresh,
    sendRequest,
    acceptRequest,
    rejectRequest,
    cancelRequest,
    removeFriend,
    searchUsers,
    shareItem,
  };
};
