-- 1) Columnas nuevas en user_downloads
ALTER TABLE public.user_downloads
  ADD COLUMN IF NOT EXISTS download_type text NOT NULL DEFAULT 'real'
    CHECK (download_type IN ('real', 'promotional', 'suspicious')),
  ADD COLUMN IF NOT EXISTS fraud_score integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_user_downloads_type ON public.user_downloads(download_type);
CREATE INDEX IF NOT EXISTS idx_user_downloads_ip_time ON public.user_downloads(ip_address, downloaded_at);
CREATE INDEX IF NOT EXISTS idx_user_downloads_user_time ON public.user_downloads(user_id, downloaded_at);

-- 2) Tabla de puntuación antifraude por usuario
CREATE TABLE IF NOT EXISTS public.user_fraud_score (
  user_id uuid PRIMARY KEY,
  score integer NOT NULL DEFAULT 0,
  is_suspicious boolean NOT NULL DEFAULT false,
  flagged_at timestamptz,
  last_event_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_fraud_score ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage fraud scores" ON public.user_fraud_score;
CREATE POLICY "Admins manage fraud scores"
  ON public.user_fraud_score
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view their own fraud score" ON public.user_fraud_score;
CREATE POLICY "Users can view their own fraud score"
  ON public.user_fraud_score
  FOR SELECT
  USING (user_id = auth.uid());

-- 3) Reescribir consume_card_credit para clasificar antifraude
CREATE OR REPLACE FUNCTION public.consume_card_credit(p_card_id uuid, p_user_id uuid, p_song_id uuid)
RETURNS TABLE(success boolean, message text, credits_left integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_card public.qr_cards%ROWTYPE;
  v_song_artist_id uuid;
  v_owns_artist boolean := false;
  v_download_type text := 'real';
  v_fraud_points integer := 0;
  v_ip text;
  v_recent_ip_count int := 0;
  v_recent_user_count int := 0;
  v_email text;
  v_new_score int;
  v_threshold int := 50;
BEGIN
  SELECT * INTO v_card
  FROM public.qr_cards
  WHERE id = p_card_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Tarjeta no encontrada'::text, 0;
    RETURN;
  END IF;

  IF v_card.owner_user_id IS DISTINCT FROM p_user_id
     AND v_card.activated_by IS DISTINCT FROM p_user_id THEN
    RETURN QUERY SELECT false, 'No eres el propietario de esta tarjeta'::text, 0;
    RETURN;
  END IF;

  IF v_card.download_credits <= 0 THEN
    RETURN QUERY SELECT false, 'Sin descargas disponibles en esta tarjeta'::text, 0;
    RETURN;
  END IF;

  -- Determinar autocompra (artista descargando su propia música)
  SELECT artist_id INTO v_song_artist_id FROM public.songs WHERE id = p_song_id;
  IF v_song_artist_id IS NOT NULL THEN
    v_owns_artist := public.user_owns_artist(p_user_id, v_song_artist_id);
    IF NOT v_owns_artist THEN
      -- Comprobar también si participa como colaborador reclamado
      SELECT EXISTS(
        SELECT 1 FROM public.song_collaborators
        WHERE song_id = p_song_id AND claimed_by_user_id = p_user_id
      ) INTO v_owns_artist;
    END IF;
  END IF;

  IF v_owns_artist THEN
    v_download_type := 'promotional';
  ELSE
    -- Reglas antifraude por velocidad
    -- Última IP conocida del usuario para esta sesión (best-effort, edge function la rellena después)
    SELECT ip_address INTO v_ip
    FROM public.user_downloads
    WHERE user_id = p_user_id AND ip_address IS NOT NULL
    ORDER BY downloaded_at DESC
    LIMIT 1;

    IF v_ip IS NOT NULL THEN
      SELECT COUNT(*) INTO v_recent_ip_count
      FROM public.user_downloads
      WHERE ip_address = v_ip
        AND downloaded_at > now() - interval '10 minutes';

      IF v_recent_ip_count >= 5 THEN
        v_download_type := 'suspicious';
        v_fraud_points := v_fraud_points + 10;
      END IF;
    END IF;

    SELECT COUNT(*) INTO v_recent_user_count
    FROM public.user_downloads
    WHERE user_id = p_user_id
      AND downloaded_at > now() - interval '1 minute';

    IF v_recent_user_count >= 1 THEN
      v_download_type := 'suspicious';
      v_fraud_points := v_fraud_points + 15;
    END IF;
  END IF;

  -- Consumir crédito
  UPDATE public.qr_cards
  SET download_credits = download_credits - 1
  WHERE id = v_card.id;

  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;

  INSERT INTO public.user_downloads (user_id, song_id, qr_card_id, user_email, download_type, fraud_score)
  VALUES (p_user_id, p_song_id, v_card.id, v_email, v_download_type, v_fraud_points);

  -- Acumular puntuación antifraude
  IF v_fraud_points > 0 THEN
    INSERT INTO public.user_fraud_score (user_id, score, last_event_at)
    VALUES (p_user_id, v_fraud_points, now())
    ON CONFLICT (user_id) DO UPDATE
      SET score = public.user_fraud_score.score + v_fraud_points,
          last_event_at = now(),
          updated_at = now();

    SELECT score INTO v_new_score FROM public.user_fraud_score WHERE user_id = p_user_id;

    IF v_new_score >= v_threshold THEN
      UPDATE public.user_fraud_score
      SET is_suspicious = true,
          flagged_at = COALESCE(flagged_at, now())
      WHERE user_id = p_user_id;
    END IF;
  END IF;

  RETURN QUERY SELECT true, 'Crédito consumido'::text, v_card.download_credits - 1;
END;
$function$;

-- 4) get_artist_stats: contar tipos y monetizar solo descargas reales
CREATE OR REPLACE FUNCTION public.get_artist_stats(p_artist_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  WITH
  artist_song_share AS (
    SELECT
      s.id AS song_id,
      s.title AS song_title,
      s.cover_url AS song_cover,
      COALESCE(SUM(
        CASE
          WHEN sc.claimed_by_user_id IS NOT NULL
               AND public.user_owns_artist(sc.claimed_by_user_id, p_artist_id)
          THEN sc.share_percent
          ELSE 0
        END
      ), 0) AS share_percent
    FROM public.songs s
    LEFT JOIN public.song_collaborators sc ON sc.song_id = s.id
    WHERE s.artist_id = p_artist_id
       OR EXISTS (
            SELECT 1 FROM public.song_collaborators sc2
            WHERE sc2.song_id = s.id
              AND sc2.claimed_by_user_id IS NOT NULL
              AND public.user_owns_artist(sc2.claimed_by_user_id, p_artist_id)
          )
    GROUP BY s.id, s.title, s.cover_url
  ),
  artist_song_share_resolved AS (
    SELECT
      ass.song_id,
      ass.song_title,
      ass.song_cover,
      CASE
        WHEN ass.share_percent = 0 AND EXISTS (
          SELECT 1 FROM public.songs s
          WHERE s.id = ass.song_id AND s.artist_id = p_artist_id
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.song_collaborators sc
          WHERE sc.song_id = ass.song_id
        )
        THEN 100
        ELSE ass.share_percent
      END AS share_percent
    FROM artist_song_share ass
  ),
  card_original AS (
    SELECT
      qc.id AS qr_card_id,
      qc.price_cents,
      (
        COALESCE(qc.download_credits, 0)
        + COALESCE((SELECT COUNT(*) FROM public.user_downloads d WHERE d.qr_card_id = qc.id), 0)
      ) AS original_credits
    FROM public.qr_cards qc
  ),
  artist_downloads AS (
    SELECT
      d.song_id,
      ass.song_title,
      d.downloaded_at,
      d.country_code,
      d.country_name,
      d.user_id,
      d.download_type,
      ass.share_percent,
      -- Solo las descargas 'real' generan ingresos
      CASE WHEN d.download_type = 'real' THEN
        (
          COALESCE(co.price_cents::numeric / NULLIF(co.original_credits, 0), 0)
          * (ass.share_percent / 100.0)
          * 0.4
        )
      ELSE 0 END AS revenue_cents
    FROM public.user_downloads d
    JOIN artist_song_share_resolved ass ON ass.song_id = d.song_id AND ass.share_percent > 0
    LEFT JOIN card_original co ON co.qr_card_id = d.qr_card_id
  ),
  totals AS (
    SELECT
      COUNT(*)::int AS total_downloads,
      COUNT(*) FILTER (WHERE download_type = 'real')::int AS real_downloads,
      COUNT(*) FILTER (WHERE download_type = 'promotional')::int AS promotional_downloads,
      COUNT(*) FILTER (WHERE download_type = 'suspicious')::int AS suspicious_downloads,
      COUNT(DISTINCT user_id) FILTER (WHERE download_type = 'real')::int AS unique_listeners,
      COALESCE(SUM(revenue_cents),0)::int AS total_revenue_cents
    FROM artist_downloads
  ),
  by_song AS (
    SELECT
      song_id,
      song_title,
      COUNT(*)::int AS downloads,
      COUNT(*) FILTER (WHERE download_type = 'real')::int AS real_downloads,
      COALESCE(SUM(revenue_cents),0)::int AS revenue_cents
    FROM artist_downloads
    GROUP BY song_id, song_title
    ORDER BY downloads DESC
    LIMIT 20
  ),
  by_country AS (
    SELECT
      COALESCE(country_code,'??') AS country_code,
      COALESCE(country_name,'Desconocido') AS country_name,
      COUNT(*)::int AS downloads
    FROM artist_downloads
    WHERE download_type = 'real'
    GROUP BY 1,2 ORDER BY downloads DESC LIMIT 50
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
    FROM artist_downloads ar
    LEFT JOIN public.profiles p ON p.user_id = ar.user_id
    WHERE ar.download_type = 'real'
    GROUP BY 1 ORDER BY downloads DESC
  ),
  by_gender AS (
    SELECT COALESCE(p.gender,'unknown') AS gender, COUNT(*)::int AS downloads
    FROM artist_downloads ar
    LEFT JOIN public.profiles p ON p.user_id = ar.user_id
    WHERE ar.download_type = 'real'
    GROUP BY 1 ORDER BY downloads DESC
  ),
  by_day AS (
    SELECT
      to_char(date_trunc('day', downloaded_at), 'YYYY-MM-DD') AS day,
      COUNT(*)::int AS downloads,
      COALESCE(SUM(revenue_cents),0)::int AS revenue_cents
    FROM artist_downloads
    WHERE downloaded_at >= now() - interval '30 days'
    GROUP BY 1 ORDER BY 1
  ),
  pool_pending AS (
    SELECT
      COALESCE(SUM(
        CASE WHEN d.download_type = 'real' THEN
          COALESCE(co.price_cents::numeric / NULLIF(co.original_credits, 0), 0)
          * (sc.share_percent / 100.0)
          * 0.4
        ELSE 0 END
      ),0)::int AS pending_revenue_cents,
      COUNT(*) FILTER (WHERE d.download_type = 'real')::int AS pending_downloads
    FROM public.song_collaborators sc
    JOIN public.user_downloads d ON d.song_id = sc.song_id
    LEFT JOIN card_original co ON co.qr_card_id = d.qr_card_id
    WHERE sc.song_id IS NOT NULL
      AND sc.claimed_by_user_id IS NULL
      AND EXISTS (
        SELECT 1 FROM public.artist_requests ar
        JOIN public.artists a ON lower(a.name) = lower(ar.artist_name)
        WHERE ar.user_id = v_uid AND ar.status = 'approved' AND a.id = p_artist_id
          AND lower(ar.artist_name) = lower(sc.artist_name)
      )
  )
  SELECT jsonb_build_object(
    'totals', (SELECT to_jsonb(t) FROM totals t),
    'by_song', COALESCE((SELECT jsonb_agg(to_jsonb(b)) FROM by_song b), '[]'::jsonb),
    'by_country', COALESCE((SELECT jsonb_agg(to_jsonb(b)) FROM by_country b), '[]'::jsonb),
    'by_age', COALESCE((SELECT jsonb_agg(to_jsonb(b)) FROM by_age b), '[]'::jsonb),
    'by_gender', COALESCE((SELECT jsonb_agg(to_jsonb(b)) FROM by_gender b), '[]'::jsonb),
    'by_day', COALESCE((SELECT jsonb_agg(to_jsonb(b)) FROM by_day b), '[]'::jsonb),
    'pool_pending', (SELECT to_jsonb(pp) FROM pool_pending pp)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;