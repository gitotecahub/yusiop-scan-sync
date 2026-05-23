import { useLocation, Link } from 'react-router-dom';
import { QrCode, Music, Library, User, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguageStore } from '@/stores/languageStore';

const BottomNav = () => {
  const location = useLocation();
  const { t } = useLanguageStore();

  const navItems = [
    { path: '/', icon: Home, label: t('nav.home') },
    { path: '/qr', icon: QrCode, label: t('nav.qr') },
    { path: '/catalog', icon: Music, label: t('nav.catalog') },
    { path: '/library', icon: Library, label: t('nav.library') },
    { path: '/profile', icon: User, label: t('nav.profile') }
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
                "relative flex flex-col items-center justify-center gap-1 px-3 pt-2 pb-2.5 rounded-2xl transition-all duration-300",
                isActive ? "vapor-text" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon
                className="h-[20px] w-[20px]"
                strokeWidth={isActive ? 2.4 : 1.7}
                fill={isActive ? 'currentColor' : 'none'}
                style={isActive ? { filter: 'drop-shadow(0 0 8px hsl(var(--primary) / 0.6))' } : undefined}
              />
              <span className={cn(
                "text-[9px] uppercase tracking-[0.16em]",
                isActive ? "font-bold" : "font-medium"
              )}>
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[3px] w-7 rounded-full vapor-bg shadow-glow" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
