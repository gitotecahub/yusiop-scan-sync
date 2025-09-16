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
    <div className={cn("absolute bottom-0 left-0 right-0 z-40 flex items-center justify-around p-2 bg-background/95 backdrop-blur-sm border-t border-border/50", (location.pathname === '/catalog' || location.pathname === '/library') ? 'translate-y-[12px]' : 'translate-y-[3px]')}>
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;
        
        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center justify-center space-y-0.5 px-2 py-1.5 rounded-lg transition-colors",
              isActive 
                ? "text-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
            <span className={cn("text-xs font-medium", isActive && "text-primary")}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
};

export default BottomNav;