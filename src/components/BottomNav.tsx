import { useLocation, Link } from 'react-router-dom';
import { QrCode, Music, Library, User, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

const BottomNav = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: 'Inicio' },
    { path: '/qr', icon: QrCode, label: 'QR' },
    { path: '/catalog', icon: Music, label: 'Catálogo' },
    { path: '/library', icon: Library, label: 'Biblioteca' },
    { path: '/profile', icon: User, label: 'Perfil' }
  ];

  return (
    <div className="fixed bottom-3 left-3 right-3 z-40">
      <div className="max-w-md mx-auto glass-strong shadow-vapor px-2 py-2 flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-2xl transition-all duration-300",
                isActive
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <span className="absolute inset-0 rounded-2xl vapor-bg shadow-glow" />
              )}
              <Icon className={cn("relative h-[18px] w-[18px]", isActive && "drop-shadow-sm")} strokeWidth={isActive ? 2.4 : 1.7} />
              <span className={cn(
                "relative text-[9px] uppercase tracking-[0.16em]",
                isActive ? "font-bold" : "font-medium"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
