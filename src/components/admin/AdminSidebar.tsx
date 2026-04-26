import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Music,
  Album,
  QrCode,
  Download,
  Settings,
  LogOut,
  Home,
  Coins,
  Calculator,
  UserCheck,
  Upload,
  Users2,
  Sparkles,
  Crown,
  Headphones,
  Wallet,
  CreditCard,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useStaffAreas, StaffArea } from '@/hooks/useStaffAreas';

type MenuItem = {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  area: StaffArea | null; // null = visible para todos los miembros del panel
  superAdminOnly?: boolean;
};

const menuItems: MenuItem[] = [
  { title: 'CEO Center', url: '/admin/ceo-center', icon: Crown, area: null, superAdminOnly: true },
  { title: 'Dashboard', url: '/admin', icon: LayoutDashboard, area: null },
  { title: 'Usuarios', url: '/admin/users', icon: Users, area: 'users' },
  { title: 'Solicitudes artista', url: '/admin/artist-requests', icon: UserCheck, area: 'artist_requests' },
  { title: 'Canciones', url: '/admin/songs', icon: Music, area: 'catalog' },
  { title: 'Envíos canciones', url: '/admin/song-submissions', icon: Upload, area: 'catalog' },
  { title: 'Reclamaciones colab.', url: '/admin/collab-claims', icon: Users2, area: 'catalog' },
  { title: 'Álbumes', url: '/admin/albums', icon: Album, area: 'catalog' },
  { title: 'Códigos QR', url: '/admin/qr-cards', icon: QrCode, area: 'qr_cards' },
  { title: 'Descargas', url: '/admin/downloads', icon: Download, area: 'monetization' },
  { title: 'Monetización', url: '/admin/monetization', icon: Coins, area: 'monetization' },
  { title: 'Simulador ventas', url: '/admin/simulator', icon: Calculator, area: 'monetization' },
  { title: 'Suscripciones', url: '/admin/subscriptions', icon: Sparkles, area: 'monetization' },
  { title: 'Retiros artistas', url: '/admin/withdrawals', icon: Wallet, area: 'monetization' },
  { title: 'Métodos de cobro', url: '/admin/payment-methods', icon: CreditCard, area: 'monetization' },
  { title: 'Soporte', url: '/admin/support', icon: Headphones, area: null },
  { title: 'Configuración', url: '/admin/settings', icon: Settings, area: 'settings' },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { signOut } = useAuth();
  const { has, isSuperAdmin } = useStaffAreas();
  const currentPath = location.pathname;
  const [pendingArtistCount, setPendingArtistCount] = useState(0);
  const [pendingSongCount, setPendingSongCount] = useState(0);
  const [pendingClaimsCount, setPendingClaimsCount] = useState(0);

  const visibleItems = menuItems.filter((item) => {
    if (item.superAdminOnly) return isSuperAdmin;
    return item.area === null || has(item.area);
  });

  const loadPendingCount = async () => {
    const { count } = await supabase
      .from('artist_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    setPendingArtistCount(count ?? 0);
  };

  const loadPendingSongs = async () => {
    const { count } = await supabase
      .from('song_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    setPendingSongCount(count ?? 0);
  };

  const loadPendingClaims = async () => {
    const { count } = await supabase
      .from('collaboration_claims')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    setPendingClaimsCount(count ?? 0);
  };

  useEffect(() => {
    loadPendingCount();
    loadPendingSongs();
    loadPendingClaims();

    const channel = supabase
      .channel('admin-sidebar-counts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'artist_requests' },
        () => loadPendingCount()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'song_submissions' },
        () => loadPendingSongs()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'collaboration_claims' },
        () => loadPendingClaims()
      )
      .subscribe();

    const handleSongsChanged = () => loadPendingSongs();
    const handleArtistsChanged = () => loadPendingCount();
    const handleClaimsChanged = () => loadPendingClaims();
    window.addEventListener('song-submissions-changed', handleSongsChanged);
    window.addEventListener('artist-requests-changed', handleArtistsChanged);
    window.addEventListener('collab-claims-changed', handleClaimsChanged);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('song-submissions-changed', handleSongsChanged);
      window.removeEventListener('artist-requests-changed', handleArtistsChanged);
      window.removeEventListener('collab-claims-changed', handleClaimsChanged);
    };
  }, []);

  // Reload when navigating to the artist requests page (in case admin reviewed some)
  useEffect(() => {
    if (currentPath.startsWith('/admin/artist-requests')) {
      loadPendingCount();
    }
    if (currentPath.startsWith('/admin/song-submissions')) {
      loadPendingSongs();
    }
    if (currentPath.startsWith('/admin/collab-claims')) {
      loadPendingClaims();
    }
  }, [currentPath]);

  const isActive = (path: string) => {
    if (path === '/admin') {
      return currentPath === '/admin';
    }
    return currentPath.startsWith(path);
  };

  const getNavCls = (path: string) =>
    isActive(path) 
      ? 'bg-primary text-primary-foreground font-medium' 
      : 'hover:bg-accent hover:text-accent-foreground';

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <Sidebar className={collapsed ? 'w-14' : 'w-60'} collapsible="icon">
      <SidebarContent>
        <div className="p-4">
          <h1 className={`font-bold text-lg bg-gradient-to-r from-yusiop-primary to-yusiop-accent bg-clip-text text-transparent ${collapsed ? 'text-xs' : ''}`}>
            {collapsed ? 'YA' : 'YUSIOP Admin'}
          </h1>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Gestión</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => {
                const isArtistRequests = item.url === '/admin/artist-requests';
                const isSongSubmissions = item.url === '/admin/song-submissions';
                const isCollabClaims = item.url === '/admin/collab-claims';
                const badgeCount = isArtistRequests
                  ? pendingArtistCount
                  : isSongSubmissions
                    ? pendingSongCount
                    : isCollabClaims
                      ? pendingClaimsCount
                      : 0;
                const showBadge = badgeCount > 0;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className={getNavCls(item.url)}>
                        <div className="relative mr-2">
                          <item.icon className="h-4 w-4" />
                          {showBadge && collapsed && (
                            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
                          )}
                        </div>
                        {!collapsed && (
                          <span className="flex-1 flex items-center justify-between gap-2">
                            <span>{item.title}</span>
                            {showBadge && (
                              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold">
                                {badgeCount > 99 ? '99+' : badgeCount}
                              </span>
                            )}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-4 space-y-1">
          <SidebarMenuButton asChild className="w-full justify-start">
            <NavLink to="/" className="hover:bg-accent hover:text-accent-foreground">
              <Home className="mr-2 h-4 w-4" />
              {!collapsed && <span>Volver a la app</span>}
            </NavLink>
          </SidebarMenuButton>
          <SidebarMenuButton 
            onClick={handleSignOut}
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {!collapsed && <span>Cerrar Sesión</span>}
          </SidebarMenuButton>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
