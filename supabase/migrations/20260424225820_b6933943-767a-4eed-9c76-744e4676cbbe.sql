
-- =========================================
-- SONG PLAYS (con antifraude)
-- =========================================
CREATE TABLE IF NOT EXISTS public.song_plays (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  song_id uuid NOT NULL,
  user_id uuid,
  session_id text,
  ip_address text,
  played_at timestamp with time zone NOT NULL DEFAULT now(),
  duration_ms integer,
  is_valid boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_song_plays_song_id ON public.song_plays(song_id);
CREATE INDEX IF NOT EXISTS idx_song_plays_played_at ON public.song_plays(played_at DESC);
CREATE INDEX IF NOT EXISTS idx_song_plays_user_song ON public.song_plays(user_id, song_id, played_at DESC);

ALTER TABLE public.song_plays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own plays"
ON public.song_plays FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Anonymous can insert plays"
ON public.song_plays FOR INSERT TO anon
WITH CHECK (user_id IS NULL);

CREATE POLICY "Users view own plays"
ON public.song_plays FOR SELECT TO authenticated
USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Admins manage plays"
ON public.song_plays FOR ALL TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- =========================================
-- SONG SHARES
-- =========================================
CREATE TABLE IF NOT EXISTS public.song_shares (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  song_id uuid NOT NULL,
  user_id uuid,
  channel text,
  shared_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_song_shares_song_id ON public.song_shares(song_id);
CREATE INDEX IF NOT EXISTS idx_song_shares_shared_at ON public.song_shares(shared_at DESC);

ALTER TABLE public.song_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own shares"
ON public.song_shares FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users view own shares"
ON public.song_shares FOR SELECT TO authenticated
USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Admins manage shares"
ON public.song_shares FOR ALL TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- =========================================
-- TRIGGER ANTIFRAUDE: cooldown 30s entre plays del mismo user+song
-- =========================================
CREATE OR REPLACE FUNCTION public.validate_song_play()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_play timestamp with time zone;
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    SELECT MAX(played_at) INTO v_last_play
    FROM public.song_plays
    WHERE user_id = NEW.user_id
      AND song_id = NEW.song_id;

    IF v_last_play IS NOT NULL AND (NEW.played_at - v_last_play) < INTERVAL '30 seconds' THEN
      NEW.is_valid := false;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_song_play ON public.song_plays;
CREATE TRIGGER trg_validate_song_play
BEFORE INSERT ON public.song_plays
FOR EACH ROW
EXECUTE FUNCTION public.validate_song_play();

-- =========================================
-- FUNCIÓN: get_popular_songs
-- =========================================
CREATE OR REPLACE FUNCTION public.get_popular_songs(
  p_period text DEFAULT 'week',
  p_limit integer DEFAULT 20,
  p_genre text DEFAULT NULL
)
RETURNS TABLE (
  song_id uuid,
  title text,
  artist_name text,
  cover_url text,
  genre text,
  downloads_count bigint,
  redemptions_count bigint,
  plays_count bigint,
  favorites_count bigint,
  shares_count bigint,
  popularity_score numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_since timestamp with time zone;
BEGIN
  v_since := CASE p_period
    WHEN 'today' THEN now() - INTERVAL '24 hours'
    WHEN 'week'  THEN now() - INTERVAL '7 days'
    WHEN 'month' THEN now() - INTERVAL '30 days'
    ELSE '1900-01-01'::timestamp with time zone
  END;

  RETURN QUERY
  WITH downloads AS (
    SELECT ud.song_id, COUNT(*) AS c
    FROM public.user_downloads ud
    WHERE ud.downloaded_at >= v_since
    GROUP BY ud.song_id
  ),
  redemptions AS (
    SELECT qc.id, gr.qr_card_id, COUNT(*) AS c
    FROM public.gift_redemptions gr
    JOIN public.qr_cards qc ON qc.id = gr.qr_card_id
    WHERE gr.redeemed_at >= v_since
    GROUP BY qc.id, gr.qr_card_id
  ),
  plays AS (
    SELECT sp.song_id, COUNT(*) AS c
    FROM public.song_plays sp
    WHERE sp.played_at >= v_since AND sp.is_valid = true
    GROUP BY sp.song_id
  ),
  favs AS (
    SELECT uf.song_id, COUNT(*) AS c
    FROM public.user_favorites uf
    WHERE uf.created_at >= v_since
    GROUP BY uf.song_id
  ),
  shares AS (
    SELECT ss.song_id, COUNT(*) AS c
    FROM public.song_shares ss
    WHERE ss.shared_at >= v_since
    GROUP BY ss.song_id
  ),
  combined AS (
    SELECT s.id AS song_id,
           COALESCE(d.c, 0) AS dl,
           0::bigint         AS rd,
           COALESCE(p.c, 0) AS pl,
           COALESCE(f.c, 0) AS fv,
           COALESCE(sh.c, 0) AS sc
    FROM public.songs s
    LEFT JOIN downloads d ON d.song_id = s.id
    LEFT JOIN plays p     ON p.song_id = s.id
    LEFT JOIN favs f      ON f.song_id = s.id
    LEFT JOIN shares sh   ON sh.song_id = s.id
    WHERE s.scheduled_release_at IS NULL OR s.scheduled_release_at <= now()
  )
  SELECT
    s.id AS song_id,
    s.title,
    a.name AS artist_name,
    COALESCE(s.cover_url, al.cover_url) AS cover_url,
    NULL::text AS genre,
    c.dl AS downloads_count,
    c.rd AS redemptions_count,
    c.pl AS plays_count,
    c.fv AS favorites_count,
    c.sc AS shares_count,
    (c.dl * 5 + c.rd * 4 + c.pl * 1 + c.fv * 2 + c.sc * 3)::numeric AS popularity_score
  FROM combined c
  JOIN public.songs s ON s.id = c.song_id
  JOIN public.artists a ON a.id = s.artist_id
  LEFT JOIN public.albums al ON al.id = s.album_id
  WHERE (c.dl + c.pl + c.fv + c.sc) > 0
  ORDER BY popularity_score DESC, s.created_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_popular_songs(text, integer, text) TO anon, authenticated;
