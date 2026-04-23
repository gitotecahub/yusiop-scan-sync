import { Navigate } from 'react-router-dom';
import { useStaffAreas, StaffArea } from '@/hooks/useStaffAreas';

interface RequireStaffAreaProps {
  area: StaffArea;
  children: React.ReactNode;
}

/**
 * Bloquea el acceso a una sección del panel admin si el usuario no es
 * super-admin ni tiene esa área asignada.
 */
export function RequireStaffArea({ area, children }: RequireStaffAreaProps) {
  const { has, loading } = useStaffAreas();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (!has(area)) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}
