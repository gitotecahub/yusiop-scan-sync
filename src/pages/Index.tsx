import { Link } from 'react-router-dom';
import { QrCode, Music, Library, User, Play, Settings } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const { isAdmin } = useAuth();
  const navCards = [
    {
      title: 'Escanear QR',
      description: 'Activa tu tarjeta',
      icon: QrCode,
      link: '/qr',
      color: 'bg-primary'
    },
    {
      title: 'Catálogo',
      description: 'Explora música',
      icon: Music,
      link: '/catalog',
      color: 'bg-secondary'
    },
    {
      title: 'Mi Biblioteca',
      description: 'Tus descargas',
      icon: Library,
      link: '/library',
      color: 'bg-accent'
    },
    {
      title: 'Perfil',
      description: 'Tu cuenta',
      icon: User,
      link: '/profile',
      color: 'bg-muted'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="text-center py-6">
        <h1 className="text-3xl font-bold mb-2 yusiop-gradient bg-clip-text text-transparent">
          Bienvenido a YUSIOP
        </h1>
        <p className="text-muted-foreground">
          Tu plataforma de música favorita
        </p>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-2 gap-4">
        {navCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.link} to={card.link}>
              <Card className="p-6 hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className={`${card.color} p-3 rounded-full`}>
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{card.title}</h3>
                    <p className="text-sm text-muted-foreground">{card.description}</p>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Admin Panel Access */}
      {isAdmin && (
        <div className="mt-6">
          <Link to="/admin">
            <Card className="p-4 bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-200 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center space-x-4">
                <div className="bg-red-500 p-3 rounded-full">
                  <Settings className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Panel de Administración</h3>
                  <p className="text-sm text-muted-foreground">
                    Gestiona usuarios, música y configuraciones
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        </div>
      )}

      {/* Music Preview Section */}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Música Popular</h2>
        <Card className="p-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
              <Music className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Canción de Ejemplo</h3>
              <p className="text-sm text-muted-foreground">Artista Popular</p>
            </div>
            <Button size="icon" variant="ghost">
              <Play className="h-5 w-5" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Index;
