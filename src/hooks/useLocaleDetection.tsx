// Hook que se ejecuta tras el login. Si el usuario aún no tiene
// `country_code` en su perfil, intenta detectarlo:
//   1) Edge function detect-location (IP / cabeceras de proxy)
//   2) Si falla, marca detectionPending=true → se muestra el gate manual
//
// GPS es OPCIONAL — se ejecuta solo si el usuario lo pide desde Perfil
// con el botón "Refinar con GPS".

import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useLocaleStore } from '@/stores/localeStore';

export function useLocaleDetection() {
  const userId = useAuthStore((s) => s.user?.id);
  const loadCountries = useLocaleStore((s) => s.loadCountries);
  const setUserLocale = useLocaleStore((s) => s.setUserLocale);
  const setDetectionPending = useLocaleStore((s) => s.setDetectionPending);

  // Carga catálogo de países (cualquier usuario, también anónimo)
  useEffect(() => {
    void loadCountries();
  }, [loadCountries]);

  // Detección por usuario
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    void (async () => {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('country_code, currency_code')
        .eq('user_id', userId)
        .maybeSingle();

      if (cancelled || error) return;

      if (profile?.country_code) {
        await loadCountries();
        setUserLocale(profile.country_code, profile.currency_code ?? undefined);
        return;
      }

      try {
        const { data: detection } = await supabase.functions.invoke(
          'detect-location',
          { body: {} },
        );
        const cc: string | null = detection?.country_code ?? null;
        if (cc && !cancelled) {
          await loadCountries();
          const country = useLocaleStore
            .getState()
            .countries.find((c) => c.country_code === cc);
          if (country) {
            await supabase
              .from('profiles')
              .update({
                country_code: cc,
                currency_code: country.default_currency,
                locale_detected_at: new Date().toISOString(),
                locale_source: detection?.source ?? 'ip',
              })
              .eq('user_id', userId);
            setUserLocale(cc, country.default_currency);
            return;
          }
        }
        if (!cancelled) setDetectionPending(true);
      } catch (err) {
        console.warn('[locale] detect-location failed', err);
        if (!cancelled) setDetectionPending(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, loadCountries, setUserLocale, setDetectionPending]);
}

/**
 * Refinar país usando GPS del navegador + reverse geocode (BigDataCloud,
 * sin API key). Devuelve el ISO-2 detectado o null.
 */
export async function detectCountryByGps(): Promise<string | null> {
  if (!('geolocation' in navigator)) return null;

  const pos = await new Promise<GeolocationPosition | null>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(p),
      () => resolve(null),
      { timeout: 10_000, enableHighAccuracy: false, maximumAge: 600_000 },
    );
  });
  if (!pos) return null;

  try {
    const { latitude, longitude } = pos.coords;
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const cc: string | undefined = data?.countryCode;
    return cc ? cc.toUpperCase() : null;
  } catch (err) {
    console.warn('[locale] reverse geocode failed', err);
    return null;
  }
}
