import { Outlet, Navigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import AdminRealtimeNotifications from '@/components/admin/AdminRealtimeNotifications';
import { useAuth } from '@/hooks/useAuth';
import { useStaffAreas } from '@/hooks/useStaffAreas';

const AdminLayout = () => {
  const { user, loading } = useAuth();
  const { areas, loading: areasLoading, isSuperAdmin } = useStaffAreas();

  if (loading || areasLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Acceso al panel: super-admin O cualquier área asignada
  if (!isSuperAdmin && areas.size === 0) {
    return <Navigate to="/" replace />;
  }

  return (
    <SidebarProvider>
      <AdminRealtimeNotifications />
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b px-4">
            <SidebarTrigger />
            <div className="ml-4">
              <h2 className="text-lg font-semibold">YUSIOP Admin</h2>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
