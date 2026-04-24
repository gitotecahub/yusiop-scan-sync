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
