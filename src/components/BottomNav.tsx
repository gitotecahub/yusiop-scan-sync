import { useLocation, Link } from 'react-router-dom';
import { QrCode, Music, Library, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const BottomNav = () => {
  const location = useLocation();

  const navItems = [
    { path: '/qr', icon: QrCode, label: 'QR' },
    { path: '/catalog', icon: Music, label: 'Catálogo' },
    { path: '/library', icon: Library, label: 'Biblioteca' },
    { path: '/profile', icon: User, label: 'Perfil' }
  ];

  return (
    <div className="yusiop-bottom-nav">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;
        
        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center justify-center space-y-1 px-3 py-2 rounded-lg transition-colors",
              isActive 
                ? "text-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className={cn("h-6 w-6", isActive && "text-primary")} />
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