import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useStaffAreas } from '@/hooks/useStaffAreas';
import { playNotificationSound } from '@/lib/notificationSound';
import { Bell, Music, UserCheck, Users2 } from 'lucide-react';
import { createElement } from 'react';

/**
 * Escucha en tiempo real eventos relevantes para el panel de admin
 * y muestra toasts + sonido cuando llegan nuevos elementos pendientes.
 *
 * Eventos vigilados:
 *  - Nueva solicitud de artista (artist_requests INSERT)
 *  - Nuevo envío de canción (song_submissions INSERT)
 *  - Nueva reclamación de colaboración (collaboration_claims INSERT)
 */
const AdminRealtimeNotifications = () => {
  const navigate = useNavigate();
  const { has, isSuperAdmin } = useStaffAreas();
  const mountedAt = useRef<number>(Date.now());

  const canArtistRequests = isSuperAdmin || has('artist_requests');
  const canCatalog = isSuperAdmin || has('catalog');

  useEffect(() => {
    const channel = supabase.channel('admin-realtime-notifications');

    if (canArtistRequests) {
      channel.on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'artist_requests' },
        (payload) => {
          // Evitar mostrar registros viejos durante la suscripción inicial
          const created = new Date((payload.new as any)?.created_at ?? Date.now()).getTime();
          if (created < mountedAt.current - 5000) return;

          const artistName = (payload.new as any)?.artist_name ?? 'Nuevo artista';
          playNotificationSound();
          toast('🎤 Nueva solicitud de artista', {
            description: artistName,
            icon: createElement(UserCheck, { className: 'h-5 w-5' }),
            action: {
              label: 'Ver',
              onClick: () => navigate('/admin/artist-requests'),
            },
            duration: 8000,
          });
          window.dispatchEvent(new Event('artist-requests-changed'));
        }
      );
    }

    if (canCatalog) {
      channel
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'song_submissions' },
          (payload) => {
            const created = new Date((payload.new as any)?.created_at ?? Date.now()).getTime();
            if (created < mountedAt.current - 5000) return;

            const title = (payload.new as any)?.title ?? 'Nueva canción';
            const artist = (payload.new as any)?.artist_name ?? '';
            playNotificationSound();
            toast('🎵 Nuevo envío de canción', {
              description: artist ? `${title} — ${artist}` : title,
              icon: createElement(Music, { className: 'h-5 w-5' }),
              action: {
                label: 'Revisar',
                onClick: () => navigate('/admin/song-submissions'),
              },
              duration: 8000,
            });
            window.dispatchEvent(new Event('song-submissions-changed'));
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'collaboration_claims' },
          (payload) => {
            const created = new Date((payload.new as any)?.created_at ?? Date.now()).getTime();
            if (created < mountedAt.current - 5000) return;

            const claimant = (payload.new as any)?.claimant_artist_name ?? 'Artista';
            playNotificationSound();
            toast('🤝 Nueva reclamación de colaboración', {
              description: claimant,
              icon: createElement(Users2, { className: 'h-5 w-5' }),
              action: {
                label: 'Ver',
                onClick: () => navigate('/admin/collab-claims'),
              },
              duration: 8000,
            });
          }
        );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [canArtistRequests, canCatalog, navigate]);

  return null;
};

export default AdminRealtimeNotifications;
