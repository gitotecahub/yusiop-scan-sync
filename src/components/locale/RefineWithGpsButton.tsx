import { useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useLocaleStore } from '@/stores/localeStore';
import { useLanguage } from '@/hooks/useLanguage';
import { detectCountryByGps } from '@/hooks/useLocaleDetection';

export default function RefineWithGpsButton() {
  const { t } = useLanguage();
  const userId = useAuthStore((s) => s.user?.id);
  const countries = useLocaleStore((s) => s.countries);
  const setUserLocale = useLocaleStore((s) => s.setUserLocale);
  const [loading, setLoading] = useState(false);

  const handleRefine = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const cc = await detectCountryByGps();
      if (!cc) {
        toast.error(t('settings.gpsFailed'));
        return;
      }
      const country = countries.find((c) => c.country_code === cc);
      if (!country) {
        toast.error(t('settings.gpsCountryUnsupported'));
        return;
      }
      await supabase
        .from('profiles')
        .update({
          country_code: cc,
          currency_code: country.default_currency,
          locale_detected_at: new Date().toISOString(),
          locale_source: 'gps',
        })
        .eq('user_id', userId);
      setUserLocale(cc, country.default_currency);
      toast.success(t('settings.gpsSuccess'));
    } catch (err) {
      console.warn('GPS refine failed', err);
      toast.error(t('settings.gpsFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleRefine}
      disabled={loading}
      className="rounded-none h-8 text-xs gap-2"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <MapPin className="h-3.5 w-3.5" />
      )}
      {t('settings.refineWithGps')}
    </Button>
  );
}
