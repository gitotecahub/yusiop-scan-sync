// Hook que se ejecuta tras el login. Si el usuario aún no tiene
// `country_code` en su perfil, intenta detectarlo:
//   1) Edge function detect-location (IP / cabeceras de proxy)
//   2) Si falla, marca como pendiente y se mostrará el selector manual
//
// GPS es OPCIONAL y se pide solo si el usuario decide refinar manualmente
// desde Perfil → Configuración (no se pide en el primer login para no
// asustar con un permiso del navegador).

import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useLocaleStore } from '@/stores/localeStore';

export function useLocaleDetection() {
  const userId = useAuthStore((s) => s.user?.id);
  const loadCountries = useLocaleStore((s) => s.loadCountries);
  const setUserLocale = useLocaleStore((s) => s.setUserLocale);

  // Carga catálogo de países (cualquier usuario, también anónimo)
  useEffect(() => {
    void loadCountries();
  }, [loadCountries]);

  // Detección por usuario
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    void (async () => {
      // 1) Leer perfil
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('country_code, currency_code')
        .eq('user_id', userId)
        .maybeSingle();

      if (cancelled || error) return;

      // Ya tiene país configurado: aplicarlo y salir
      if (profile?.country_code) {
        await loadCountries();
        setUserLocale(profile.country_code, profile.currency_code ?? undefined);
        return;
      }

      // 2) Detectar por IP via edge function
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
          }
        }
      } catch (err) {
        console.warn('[locale] detect-location failed', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, loadCountries, setUserLocale]);
}
