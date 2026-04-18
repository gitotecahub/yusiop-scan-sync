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
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border">
      <div className="max-w-md mx-auto px-2 py-2 flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 px-3 py-2 transition-colors duration-200",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.2 : 1.6} />
              <span className={cn(
                "text-[9px] uppercase tracking-[0.18em]",
                isActive ? "font-semibold" : "font-medium"
              )}>
                {item.label}
              </span>
              {isActive && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
