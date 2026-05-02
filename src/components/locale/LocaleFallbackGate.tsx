// Pantalla bloqueante mostrada cuando la detección automática de país
// falló. El usuario debe elegir país e idioma manualmente para continuar.

import { useEffect, useMemo, useState } from 'react';
import { Globe, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useLocaleStore } from '@/stores/localeStore';
import { useLanguageStore, LANGUAGES, type Language } from '@/stores/languageStore';

export default function LocaleFallbackGate() {
  const t = useLanguageStore((s) => s.t);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const currentLang = useLanguageStore((s) => s.language);

  const userId = useAuthStore((s) => s.user?.id);
  const countries = useLocaleStore((s) => s.countries);
  const loadCountries = useLocaleStore((s) => s.loadCountries);
  const setUserLocale = useLocaleStore((s) => s.setUserLocale);

  const [country, setCountry] = useState<string>('');
  const [language, setLang] = useState<Language>(currentLang);
  const [saving, setSaving] = useState(false);

  useEffect(() => { void loadCountries(); }, [loadCountries]);

  // Cuando se elige país, sugerir su idioma por defecto
  useEffect(() => {
    if (!country) return;
    const c = countries.find((x) => x.country_code === country);
    if (c?.default_language) setLang(c.default_language);
  }, [country, countries]);

  const sortedCountries = useMemo(
    () => [...countries].sort((a, b) => a.country_name.localeCompare(b.country_name)),
    [countries],
  );

  const handleContinue = async () => {
    if (!userId || !country) return;
    const c = countries.find((x) => x.country_code === country);
    if (!c) return;
    setSaving(true);
    try {
      await supabase
        .from('profiles')
        .update({
          country_code: country,
          currency_code: c.default_currency,
          locale_detected_at: new Date().toISOString(),
          locale_source: 'manual_gate',
        })
        .eq('user_id', userId);
      setLanguage(language);
      setUserLocale(country, c.default_currency);
    } catch (err) {
      console.warn('[localeGate] save failed', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Globe className="w-6 h-6 text-primary" strokeWidth={1.5} />
          </div>
          <h1 className="font-display text-xl font-semibold">{t('localeGate.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('localeGate.subtitle')}</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              {t('localeGate.country')}
            </label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="rounded-none">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent className="max-h-[280px]">
                {sortedCountries.map((c) => (
                  <SelectItem key={c.country_code} value={c.country_code}>
                    {c.country_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              {t('localeGate.language')}
            </label>
            <Select value={language} onValueChange={(v) => setLang(v as Language)}>
              <SelectTrigger className="rounded-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[280px]">
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    <span className="mr-2">{l.flag}</span>{l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={handleContinue}
          disabled={!country || saving}
          className="w-full rounded-none h-11"
        >
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {t('localeGate.continue')}
        </Button>
      </div>
    </div>
  );
}
