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
    <div className="fixed bottom-3 left-3 right-3 z-40 safe-area-inset-bottom">
      <div className="glass-strong rounded-3xl px-2 py-2 flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all duration-300",
                isActive
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <span className="absolute inset-0 vapor-gradient rounded-2xl shadow-glow" aria-hidden />
              )}
              <Icon className={cn("h-5 w-5 relative z-10", isActive && "drop-shadow")} />
              <span className={cn("text-[10px] font-medium relative z-10", isActive && "font-semibold")}>
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
