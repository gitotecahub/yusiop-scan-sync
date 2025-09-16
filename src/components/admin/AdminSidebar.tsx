import { useState } from 'react';
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

const menuItems = [
  { title: 'Dashboard', url: '/admin', icon: LayoutDashboard },
  { title: 'Usuarios', url: '/admin/users', icon: Users },
  { title: 'Canciones', url: '/admin/songs', icon: Music },
  { title: 'Álbumes', url: '/admin/albums', icon: Album },
  { title: 'Códigos QR', url: '/admin/qr-cards', icon: QrCode },
  { title: 'Descargas', url: '/admin/downloads', icon: Download },
  { title: 'Configuración', url: '/admin/settings', icon: Settings },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { signOut } = useAuth();
  const currentPath = location.pathname;

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
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls(item.url)}>
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-4">
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