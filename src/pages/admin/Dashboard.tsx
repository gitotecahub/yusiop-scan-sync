import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Music, Album, QrCode, TrendingUp, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  totalUsers: number;
  totalSongs: number;
  totalAlbums: number;
  totalQRCards: number;
  totalDownloads: number;
  activeUsers: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalSongs: 0,
    totalAlbums: 0,
    totalQRCards: 0,
    totalDownloads: 0,
    activeUsers: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch users count
        const { count: usersCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // Fetch songs count
        const { count: songsCount } = await supabase
          .from('songs')
          .select('*', { count: 'exact', head: true });

        // Fetch albums count
        const { count: albumsCount } = await supabase
          .from('albums')
          .select('*', { count: 'exact', head: true });

        // Fetch QR cards count
        const { count: qrCardsCount } = await supabase
          .from('qr_cards')
          .select('*', { count: 'exact', head: true });

        // Fetch downloads count
        const { count: downloadsCount } = await supabase
          .from('user_downloads')
          .select('*', { count: 'exact', head: true });

        // Fetch active users (users with recent activity)
        const { count: activeUsersCount } = await supabase
          .from('user_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        setStats({
          totalUsers: usersCount || 0,
          totalSongs: songsCount || 0,
          totalAlbums: albumsCount || 0,
          totalQRCards: qrCardsCount || 0,
          totalDownloads: downloadsCount || 0,
          activeUsers: activeUsersCount || 0,
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      }
    };

    fetchStats();
  }, []);

  const statsCards = [
    {
      title: 'Total de Usuarios',
      value: stats.totalUsers,
      icon: Users,
      description: 'Usuarios registrados',
    },
    {
      title: 'Usuarios Activos',
      value: stats.activeUsers,
      icon: TrendingUp,
      description: 'Usuarios con sesión activa',
    },
    {
      title: 'Canciones',
      value: stats.totalSongs,
      icon: Music,
      description: 'Canciones en el catálogo',
    },
    {
      title: 'Álbumes',
      value: stats.totalAlbums,
      icon: Album,
      description: 'Álbumes disponibles',
    },
    {
      title: 'Códigos QR',
      value: stats.totalQRCards,
      icon: QrCode,
      description: 'Tarjetas QR creadas',
    },
    {
      title: 'Descargas',
      value: stats.totalDownloads,
      icon: Download,
      description: 'Descargas totales',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-yusiop-primary to-yusiop-accent bg-clip-text text-transparent">
          Panel de Administración
        </h1>
        <p className="text-muted-foreground">
          Gestiona tu plataforma YUSIOP desde aquí
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>
              Últimas acciones en la plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Sin actividad reciente que mostrar
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Accesos Rápidos</CardTitle>
            <CardDescription>
              Funciones administrativas frecuentes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <button className="w-full text-left p-2 rounded hover:bg-accent text-sm">
              Crear nuevo código QR
            </button>
            <button className="w-full text-left p-2 rounded hover:bg-accent text-sm">
              Agregar nueva canción
            </button>
            <button className="w-full text-left p-2 rounded hover:bg-accent text-sm">
              Gestionar usuarios
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;