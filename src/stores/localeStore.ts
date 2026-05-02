import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { useLanguageStore, type Language } from '@/stores/languageStore';

export interface CountrySetting {
  country_code: string;
  country_name: string;
  default_language: Language;
  default_currency: string;
  currency_symbol: string | null;
  eur_to_currency_rate: number;
  decimals: number;
  enabled: boolean;
}

interface LocaleState {
  countries: CountrySetting[];
  currentCountry: CountrySetting | null;
  currencyCode: string | null;
  countryCode: string | null;
  loading: boolean;
  loaded: boolean;
  loadCountries: () => Promise<void>;
  setUserLocale: (countryCode: string, currencyCode?: string) => void;
  reset: () => void;
}

export const useLocaleStore = create<LocaleState>((set, get) => ({
  countries: [],
  currentCountry: null,
  currencyCode: null,
  countryCode: null,
  loading: false,
  loaded: false,

  loadCountries: async () => {
    if (get().loaded || get().loading) return;
    set({ loading: true });
    const { data, error } = await supabase
      .from('country_settings')
      .select('*')
      .eq('enabled', true)
      .order('country_name', { ascending: true });

    if (error) {
      console.warn('[locale] Failed to load country settings', error);
      set({ loading: false, loaded: true, countries: [] });
      return;
    }

    set({
      countries: (data ?? []) as CountrySetting[],
      loading: false,
      loaded: true,
    });
  },

  setUserLocale: (countryCode, currencyCode) => {
    const country =
      get().countries.find((c) => c.country_code === countryCode) ?? null;

    set({
      countryCode,
      currentCountry: country,
      currencyCode: currencyCode ?? country?.default_currency ?? null,
    });

    // Sincronizar idioma de la app con el del país
    if (country) {
      const lang = country.default_language;
      const langStore = useLanguageStore.getState();
      if (langStore.language !== lang) {
        langStore.setLanguage(lang);
      }
    }
  },

  reset: () =>
    set({
      currentCountry: null,
      currencyCode: null,
      countryCode: null,
    }),
}));
