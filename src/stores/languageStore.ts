import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Language, TranslationKey } from '@/lib/translations';
import { LANGUAGES, translations } from '@/lib/translations';

export type { Language, TranslationKey };
export { LANGUAGES, translations };

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: 'es',
      setLanguage: (language) => {
        set({ language });
        if (typeof document !== 'undefined') {
          document.documentElement.lang = language;
        }
      },
      t: (key: TranslationKey) => {
        const { language } = get();
        return translations[language][key] || translations['es'][key] || key;
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
