import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type StaffArea =
  | 'catalog'
  | 'users'
  | 'artist_requests'
  | 'qr_cards'
  | 'monetization'
  | 'settings';

export const STAFF_AREA_LABELS: Record<StaffArea, string> = {
  catalog: 'Catálogo (canciones, álbumes, envíos, colaboraciones)',
  users: 'Usuarios y CRM',
  artist_requests: 'Solicitudes de artista',
  qr_cards: 'Tarjetas QR',
  monetization: 'Monetización (descargas y simulador)',
  settings: 'Configuración',
};

export const STAFF_AREA_LIST: StaffArea[] = [
  'catalog',
  'users',
  'artist_requests',
  'qr_cards',
  'monetization',
  'settings',
];

interface StaffAreasState {
  areas: Set<StaffArea>;
  loading: boolean;
  isSuperAdmin: boolean;
  has: (area: StaffArea) => boolean;
  refresh: () => Promise<void>;
}

export function useStaffAreas(): StaffAreasState {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [areas, setAreas] = useState<Set<StaffArea>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) {
      setAreas(new Set());
      setLoading(false);
      return;
    }
    if (isAdmin) {
      setAreas(new Set(STAFF_AREA_LIST));
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('staff_permissions')
      .select('area')
      .eq('user_id', user.id);
    if (!error && data) {
      setAreas(new Set(data.map((r) => r.area as StaffArea)));
    } else {
      setAreas(new Set());
    }
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isAdmin, authLoading]);

  return {
    areas,
    loading: loading || authLoading,
    isSuperAdmin: isAdmin,
    has: (area: StaffArea) => isAdmin || areas.has(area),
    refresh: load,
  };
}
