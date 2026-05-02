ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country_code text,
  ADD COLUMN IF NOT EXISTS currency_code text,
  ADD COLUMN IF NOT EXISTS locale_detected_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS locale_source text;

CREATE TABLE IF NOT EXISTS public.country_settings (
  country_code text PRIMARY KEY,
  country_name text NOT NULL,
  default_language text NOT NULL,
  default_currency text NOT NULL,
  currency_symbol text,
  eur_to_currency_rate numeric NOT NULL DEFAULT 1,
  decimals smallint NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.country_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Country settings are publicly readable" ON public.country_settings;
CREATE POLICY "Country settings are publicly readable"
  ON public.country_settings FOR SELECT
  USING (enabled = true);

DROP POLICY IF EXISTS "Admins manage country settings" ON public.country_settings;
CREATE POLICY "Admins manage country settings"
  ON public.country_settings FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

DROP TRIGGER IF EXISTS update_country_settings_updated_at ON public.country_settings;
CREATE TRIGGER update_country_settings_updated_at
  BEFORE UPDATE ON public.country_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.country_settings
  (country_code, country_name, default_language, default_currency, currency_symbol, eur_to_currency_rate, decimals)
VALUES
  ('GQ', 'Guinea Ecuatorial', 'es', 'XAF', 'FCFA', 655.957, 0),
  ('ES', 'España',            'es', 'EUR', '€',    1,       2),
  ('FR', 'France',             'fr', 'EUR', '€',    1,       2),
  ('CM', 'Cameroun',           'fr', 'XAF', 'FCFA', 655.957, 0),
  ('GA', 'Gabon',              'fr', 'XAF', 'FCFA', 655.957, 0),
  ('CG', 'Congo',              'fr', 'XAF', 'FCFA', 655.957, 0),
  ('SN', 'Sénégal',            'fr', 'XOF', 'FCFA', 655.957, 0),
  ('CI', 'Côte d''Ivoire',     'fr', 'XOF', 'FCFA', 655.957, 0),
  ('BJ', 'Bénin',              'fr', 'XOF', 'FCFA', 655.957, 0),
  ('ML', 'Mali',               'fr', 'XOF', 'FCFA', 655.957, 0),
  ('NG', 'Nigeria',            'en', 'NGN', '₦',    1700,    2),
  ('GH', 'Ghana',              'en', 'GHS', 'GH₵',  16,      2),
  ('KE', 'Kenya',              'en', 'KES', 'KSh',  140,     2),
  ('ZA', 'South Africa',       'en', 'ZAR', 'R',    20,      2)
ON CONFLICT (country_code) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_profiles_country_code ON public.profiles(country_code);