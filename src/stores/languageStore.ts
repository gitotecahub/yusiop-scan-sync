import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = 'es' | 'en' | 'fr' | 'pt';

export const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
];

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'es',
      setLanguage: (language) => {
        set({ language });
        if (typeof document !== 'undefined') {
          document.documentElement.lang = language;
        }
      },
    }),
    {
      name: 'yusiop-language',
      onRehydrateStorage: () => (state) => {
        if (state && typeof document !== 'undefined') {
          document.documentElement.lang = state.language;
        }
      },
    },
  ),
);
