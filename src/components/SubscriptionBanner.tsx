import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useSubscriptionVisibility } from '@/hooks/useSubscriptionVisibility';
import { useMySubscription } from '@/hooks/useSubscriptionPlans';

/**
 * Banner promocional para Home — solo se renderiza si el feature flag
 * y las reglas de segmentación lo permiten para este usuario.
 */
const SubscriptionBanner = () => {
  const { visible, loading } = useSubscriptionVisibility();
  const { subscription, loading: subLoading } = useMySubscription();

  if (loading || subLoading || !visible) return null;
  if (subscription) return null; // ya está suscrito → no mostrar banner

  return (
    <Link
      to="/subscriptions"
      className="block relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-[hsl(250_95%_25%)] via-[hsl(280_85%_30%)] to-[hsl(188_85%_30%)] text-white shadow-lg shadow-primary/20 group"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
      <div className="relative flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            <span className="text-[10px] font-semibold uppercase tracking-wider opacity-90">YUSIOP Premium</span>
          </div>
          <h3 className="text-base sm:text-lg font-bold leading-tight">
            Descarga sin límites cada mes
          </h3>
          <p className="text-xs sm:text-sm opacity-80 mt-1">
            Desde 3.000 XAF · Cancela cuando quieras
          </p>
        </div>
        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-white/20 backdrop-blur group-hover:bg-white/30 transition-colors flex-shrink-0">
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
};

export default SubscriptionBanner;
