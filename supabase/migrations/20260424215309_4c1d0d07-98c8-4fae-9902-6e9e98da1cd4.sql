-- Crear enum para los niveles de express
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'express_tier') THEN
    CREATE TYPE public.express_tier AS ENUM ('72h', '48h', '24h');
  END IF;
END$$;

-- Añadir columnas a song_submissions
ALTER TABLE public.song_submissions
  ADD COLUMN IF NOT EXISTS express_tier public.express_tier,
  ADD COLUMN IF NOT EXISTS express_price_xaf integer,
  ADD COLUMN IF NOT EXISTS express_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS express_requested_at timestamptz;

-- Índice para que admin pueda priorizar fácilmente
CREATE INDEX IF NOT EXISTS idx_song_submissions_express_tier
  ON public.song_submissions (express_tier, express_requested_at)
  WHERE express_tier IS NOT NULL;