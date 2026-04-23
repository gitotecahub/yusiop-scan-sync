-- 1. Añadir campos geográficos a user_downloads
ALTER TABLE public.user_downloads
  ADD COLUMN IF NOT EXISTS country_code text,
  ADD COLUMN IF NOT EXISTS country_name text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS ip_address text;

CREATE INDEX IF NOT EXISTS idx_user_downloads_country ON public.user_downloads(country_code);
CREATE INDEX IF NOT EXISTS idx_user_downloads_song ON public.user_downloads(song_id);

-- 2. Añadir campos demográficos a profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birth_year smallint,
  ADD COLUMN IF NOT EXISTS gender text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_gender_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_gender_check
  CHECK (gender IS NULL OR gender IN ('male','female','non_binary','prefer_not_to_say'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_birth_year_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_birth_year_check
  CHECK (birth_year IS NULL OR (birth_year BETWEEN 1900 AND 2025));

-- 3. Helper: comprobar si el usuario es dueño del artista
CREATE OR REPLACE FUNCTION public.user_owns_artist(_user_id uuid, _artist_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.artist_requests ar
    JOIN public.artists a ON lower(a.name) = lower(ar.artist_name)
    WHERE ar.user_id = _user_id
      AND ar.status = 'approved'
      AND a.id = _artist_id
  );
$$;

-- 4. Función agregada de estadísticas del artista
CREATE OR REPLACE FUNCTION public.get_artist_stats(p_artist_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_result jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF NOT (public.is_admin(v_uid) OR public.user_owns_artist(v_uid, p_artist_id)) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  WITH artist_songs AS (
    SELECT id, title, cover_url FROM public.songs WHERE artist_id = p_artist_id
  ),
  -- descargas con peso (1 / nº de canciones de ese artista en la misma tarjeta)
  artist_dl AS (
    SELECT
      d.*,
      s.title AS song_title,
      s.cover_url AS song_cover
    FROM public.user_downloads d
    JOIN artist_songs s ON s.id = d.song_id
  ),
  -- ingresos: precio de la tarjeta repartido entre TODAS las descargas de esa tarjeta
  card_split AS (
    SELECT
      d.qr_card_id,
      COUNT(*) AS total_dl_on_card
    FROM public.user_downloads d
    WHERE d.qr_card_id IS NOT NULL
    GROUP BY d.qr_card_id
  ),
  artist_revenue AS (
    SELECT
      ad.song_id,
      ad.song_title,
      ad.downloaded_at,
      ad.country_code,
      ad.country_name,
      ad.user_id,
      COALESCE(qc.price_cents::numeric / NULLIF(cs.total_dl_on_card,0), 0) AS revenue_cents
    FROM artist_dl ad
    LEFT JOIN public.qr_cards qc ON qc.id = ad.qr_card_id
    LEFT JOIN card_split cs ON cs.qr_card_id = ad.qr_card_id
  ),
  totals AS (
    SELECT
      COUNT(*)::int AS total_downloads,
      COUNT(DISTINCT user_id)::int AS unique_listeners,
      COALESCE(SUM(revenue_cents),0)::int AS total_revenue_cents
    FROM artist_revenue
  ),
  by_song AS (
    SELECT
      song_id,
      song_title,
      COUNT(*)::int AS downloads,
      COALESCE(SUM(revenue_cents),0)::int AS revenue_cents
    FROM artist_revenue
    GROUP BY song_id, song_title
    ORDER BY downloads DESC
    LIMIT 20
  ),
  by_country AS (
    SELECT
      COALESCE(country_code,'??') AS country_code,
      COALESCE(country_name,'Desconocido') AS country_name,
      COUNT(*)::int AS downloads
    FROM artist_revenue
    GROUP BY 1,2
    ORDER BY downloads DESC
    LIMIT 50
  ),
  by_age AS (
    SELECT
      CASE
        WHEN p.birth_year IS NULL THEN 'Desconocido'
        WHEN (extract(year from now())::int - p.birth_year) < 18 THEN '<18'
        WHEN (extract(year from now())::int - p.birth_year) BETWEEN 18 AND 24 THEN '18-24'
        WHEN (extract(year from now())::int - p.birth_year) BETWEEN 25 AND 34 THEN '25-34'
        WHEN (extract(year from now())::int - p.birth_year) BETWEEN 35 AND 44 THEN '35-44'
        WHEN (extract(year from now())::int - p.birth_year) BETWEEN 45 AND 54 THEN '45-54'
        ELSE '55+'
      END AS bucket,
      COUNT(*)::int AS downloads
    FROM artist_revenue ar
    LEFT JOIN public.profiles p ON p.user_id = ar.user_id
    GROUP BY 1
    ORDER BY downloads DESC
  ),
  by_gender AS (
    SELECT
      COALESCE(p.gender, 'unknown') AS gender,
      COUNT(*)::int AS downloads
    FROM artist_revenue ar
    LEFT JOIN public.profiles p ON p.user_id = ar.user_id
    GROUP BY 1
    ORDER BY downloads DESC
  ),
  by_day AS (
    SELECT
      to_char(date_trunc('day', downloaded_at), 'YYYY-MM-DD') AS day,
      COUNT(*)::int AS downloads,
      COALESCE(SUM(revenue_cents),0)::int AS revenue_cents
    FROM artist_revenue
    WHERE downloaded_at >= now() - interval '30 days'
    GROUP BY 1
    ORDER BY 1
  )
  SELECT jsonb_build_object(
    'totals', (SELECT to_jsonb(t) FROM totals t),
    'by_song', COALESCE((SELECT jsonb_agg(to_jsonb(b)) FROM by_song b), '[]'::jsonb),
    'by_country', COALESCE((SELECT jsonb_agg(to_jsonb(b)) FROM by_country b), '[]'::jsonb),
    'by_age', COALESCE((SELECT jsonb_agg(to_jsonb(b)) FROM by_age b), '[]'::jsonb),
    'by_gender', COALESCE((SELECT jsonb_agg(to_jsonb(b)) FROM by_gender b), '[]'::jsonb),
    'by_day', COALESCE((SELECT jsonb_agg(to_jsonb(b)) FROM by_day b), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;