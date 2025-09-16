import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, UserPlus, Shield, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  downloads_remaining: number;
  created_at: string;
  role?: string;
}

const Users = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Fetch profiles with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          *,
          user_roles!inner(role)
        `);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return;
      }

      // Transform data to include role
      const usersWithRoles = profiles?.map(profile => ({
        ...profile,
        role: (profile as any).user_roles?.role || 'user'
      })) || [];

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los usuarios',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminRole = async (userId: string, currentRole: string) => {
    try {
      if (currentRole === 'admin') {
        // Remove admin role
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');

        if (error) throw error;
      } else {
        // Add admin role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'admin' });

        if (error) throw error;
      }

      toast({
        title: 'Éxito',
        description: `Rol ${currentRole === 'admin' ? 'removido' : 'asignado'} correctamente`,
      });

      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el rol del usuario',
        variant: 'destructive',
      });
    }
  };

  const filteredUsers = users.filter(user =>
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">
            Administra los usuarios de la plataforma
          </p>
        </div>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar Usuarios</CardTitle>
          <CardDescription>
            Encuentra usuarios por nombre o username
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filteredUsers.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-yusiop-primary to-yusiop-accent rounded-full flex items-center justify-center text-white font-bold">
                    {user.username?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h3 className="font-semibold">{user.full_name || user.username}</h3>
                    <p className="text-sm text-muted-foreground">@{user.username}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role === 'admin' ? 'Administrador' : 'Usuario'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {user.downloads_remaining} descargas restantes
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant={user.role === 'admin' ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={() => toggleAdminRole(user.user_id, user.role || 'user')}
                  >
                    {user.role === 'admin' ? (
                      <>
                        <ShieldCheck className="h-4 w-4 mr-1" />
                        Quitar Admin
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4 mr-1" />
                        Hacer Admin
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No se encontraron usuarios</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Users;