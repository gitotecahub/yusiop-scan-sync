-- =========================================================================
-- 1) TABLA: song_collaborators
-- =========================================================================
CREATE TABLE public.song_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NULL,
  song_id uuid NULL,
  artist_name text NOT NULL,
  share_percent numeric(5,2) NOT NULL CHECK (share_percent >= 0 AND share_percent <= 100),
  is_primary boolean NOT NULL DEFAULT false,
  claimed_by_user_id uuid NULL,
  claimed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT song_collaborators_target_chk
    CHECK ((submission_id IS NOT NULL) <> (song_id IS NOT NULL))
);

CREATE INDEX idx_song_collab_submission ON public.song_collaborators(submission_id);
CREATE INDEX idx_song_collab_song ON public.song_collaborators(song_id);
CREATE INDEX idx_song_collab_name_lower ON public.song_collaborators(lower(artist_name));
CREATE INDEX idx_song_collab_claimed ON public.song_collaborators(claimed_by_user_id);

CREATE TRIGGER trg_song_collaborators_updated_at
BEFORE UPDATE ON public.song_collaborators
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.song_collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner of submission can view collaborators"
ON public.song_collaborators FOR SELECT TO authenticated
USING (
  submission_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.song_submissions s
    WHERE s.id = song_collaborators.submission_id AND s.user_id = auth.uid()
  )
);

CREATE POLICY "Owner of submission can manage collaborators (insert)"
ON public.song_collaborators FOR INSERT TO authenticated
WITH CHECK (
  submission_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.song_submissions s
    WHERE s.id = song_collaborators.submission_id
      AND s.user_id = auth.uid()
      AND s.status IN ('pending','rejected')
  )
);

CREATE POLICY "Owner of submission can manage collaborators (update)"
ON public.song_collaborators FOR UPDATE TO authenticated
USING (
  submission_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.song_submissions s
    WHERE s.id = song_collaborators.submission_id
      AND s.user_id = auth.uid()
      AND s.status IN ('pending','rejected')
  )
)
WITH CHECK (
  submission_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.song_submissions s
    WHERE s.id = song_collaborators.submission_id
      AND s.user_id = auth.uid()
      AND s.status IN ('pending','rejected')
  )
);

CREATE POLICY "Owner of submission can manage collaborators (delete)"
ON public.song_collaborators FOR DELETE TO authenticated
USING (
  submission_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.song_submissions s
    WHERE s.id = song_collaborators.submission_id
      AND s.user_id = auth.uid()
      AND s.status IN ('pending','rejected')
  )
);

CREATE POLICY "Artist owners can view song collaborators"
ON public.song_collaborators FOR SELECT TO authenticated
USING (
  song_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.songs s
    WHERE s.id = song_collaborators.song_id
      AND public.user_owns_artist(auth.uid(), s.artist_id)
  )
);

CREATE POLICY "Verified artists can view unclaimed pool"
ON public.song_collaborators FOR SELECT TO authenticated
USING (
  claimed_by_user_id IS NULL
  AND song_id IS NOT NULL
  AND public.has_role(auth.uid(), 'artist')
);

CREATE POLICY "Admins manage collaborators"
ON public.song_collaborators FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));


-- =========================================================================
-- 2) TABLA: collaboration_claims
-- =========================================================================
CREATE TYPE public.collab_claim_status AS ENUM ('pending','approved','rejected');

CREATE TABLE public.collaboration_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id uuid NOT NULL REFERENCES public.song_collaborators(id) ON DELETE CASCADE,
  claimant_user_id uuid NOT NULL,
  claimant_artist_name text NOT NULL,
  message text NULL,
  status public.collab_claim_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid NULL,
  reviewed_at timestamptz NULL,
  rejection_reason text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_collab_claims_user ON public.collaboration_claims(claimant_user_id);
CREATE INDEX idx_collab_claims_status ON public.collaboration_claims(status);

CREATE TRIGGER trg_collab_claims_updated_at
BEFORE UPDATE ON public.collaboration_claims
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.collaboration_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own claims"
ON public.collaboration_claims FOR SELECT TO authenticated
USING (claimant_user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Verified artists can create claims"
ON public.collaboration_claims FOR INSERT TO authenticated
WITH CHECK (
  claimant_user_id = auth.uid()
  AND public.has_role(auth.uid(), 'artist')
);

CREATE POLICY "Admins update claims"
ON public.collaboration_claims FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins delete claims"
ON public.collaboration_claims FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));


-- =========================================================================
-- 3) approve_song_submission con copia de splits
-- =========================================================================
CREATE OR REPLACE FUNCTION public.approve_song_submission(p_submission_id uuid)
RETURNS TABLE(success boolean, message text, song_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_submission public.song_submissions%ROWTYPE;
  v_artist_id uuid;
  v_album_id uuid;
  v_song_id uuid;
  v_collab_count int;
  v_sum numeric;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN QUERY SELECT false, 'No autorizado'::text, NULL::uuid;
    RETURN;
  END IF;

  SELECT * INTO v_submission FROM public.song_submissions WHERE id = p_submission_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Envío no encontrado'::text, NULL::uuid;
    RETURN;
  END IF;

  IF v_submission.status <> 'pending' THEN
    RETURN QUERY SELECT false, 'El envío ya fue revisado'::text, NULL::uuid;
    RETURN;
  END IF;

  SELECT COUNT(*), COALESCE(SUM(share_percent),0)
    INTO v_collab_count, v_sum
  FROM public.song_collaborators
  WHERE submission_id = p_submission_id;

  IF v_collab_count > 0 AND v_sum <> 100 THEN
    RETURN QUERY SELECT false, ('La suma de splits debe ser 100% (actual: ' || v_sum || '%)')::text, NULL::uuid;
    RETURN;
  END IF;

  SELECT id INTO v_artist_id FROM public.artists WHERE lower(name) = lower(v_submission.artist_name) LIMIT 1;
  IF v_artist_id IS NULL THEN
    INSERT INTO public.artists (name) VALUES (v_submission.artist_name) RETURNING id INTO v_artist_id;
  END IF;

  IF v_submission.album_title IS NOT NULL AND length(trim(v_submission.album_title)) > 0 THEN
    SELECT id INTO v_album_id FROM public.albums
      WHERE artist_id = v_artist_id AND lower(title) = lower(v_submission.album_title)
      LIMIT 1;
    IF v_album_id IS NULL THEN
      INSERT INTO public.albums (artist_id, title, release_date, cover_url)
        VALUES (v_artist_id, v_submission.album_title, v_submission.release_date, v_submission.cover_url)
        RETURNING id INTO v_album_id;
    END IF;
  END IF;

  INSERT INTO public.songs (
    artist_id, album_id, title, duration_seconds,
    cover_url, track_url, preview_url, preview_start_seconds
  ) VALUES (
    v_artist_id, v_album_id, v_submission.title, v_submission.duration_seconds,
    v_submission.cover_url, v_submission.track_url, v_submission.preview_url, v_submission.preview_start_seconds
  ) RETURNING id INTO v_song_id;

  IF v_collab_count > 0 THEN
    INSERT INTO public.song_collaborators
      (song_id, artist_name, share_percent, is_primary, claimed_by_user_id, claimed_at)
    SELECT
      v_song_id,
      sc.artist_name,
      sc.share_percent,
      sc.is_primary,
      CASE
        WHEN lower(sc.artist_name) = lower(v_submission.artist_name) THEN v_submission.user_id
        ELSE NULL
      END,
      CASE
        WHEN lower(sc.artist_name) = lower(v_submission.artist_name) THEN now()
        ELSE NULL
      END
    FROM public.song_collaborators sc
    WHERE sc.submission_id = p_submission_id;
  ELSE
    INSERT INTO public.song_collaborators
      (song_id, artist_name, share_percent, is_primary, claimed_by_user_id, claimed_at)
    VALUES
      (v_song_id, v_submission.artist_name, 100, true, v_submission.user_id, now());
  END IF;

  UPDATE public.song_submissions
    SET status = 'approved',
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        published_song_id = v_song_id,
        rejection_reason = NULL
    WHERE id = p_submission_id;

  RETURN QUERY SELECT true, 'Canción publicada en el catálogo'::text, v_song_id;
END;
$$;


-- =========================================================================
-- 4) get_artist_stats con splits aplicados
-- =========================================================================
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
  card_split AS (
    SELECT d.qr_card_id, COUNT(*) AS total_dl_on_card
    FROM public.user_downloads d
    WHERE d.qr_card_id IS NOT NULL
    GROUP BY d.qr_card_id
  ),
  artist_revenue AS (
    SELECT
      d.song_id,
      ass.song_title,
      d.downloaded_at,
      d.country_code,
      d.country_name,
      d.user_id,
      ass.share_percent,
      COALESCE(qc.price_cents::numeric / NULLIF(cs.total_dl_on_card,0), 0)
        * (ass.share_percent / 100.0) AS revenue_cents
    FROM public.user_downloads d
    JOIN artist_song_share_resolved ass ON ass.song_id = d.song_id AND ass.share_percent > 0
    LEFT JOIN public.qr_cards qc ON qc.id = d.qr_card_id
    LEFT JOIN card_split cs ON cs.qr_card_id = d.qr_card_id
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
    FROM artist_revenue ar
    LEFT JOIN public.profiles p ON p.user_id = ar.user_id
    GROUP BY 1 ORDER BY downloads DESC
  ),
  by_gender AS (
    SELECT COALESCE(p.gender,'unknown') AS gender, COUNT(*)::int AS downloads
    FROM artist_revenue ar
    LEFT JOIN public.profiles p ON p.user_id = ar.user_id
    GROUP BY 1 ORDER BY downloads DESC
  ),
  by_day AS (
    SELECT
      to_char(date_trunc('day', downloaded_at), 'YYYY-MM-DD') AS day,
      COUNT(*)::int AS downloads,
      COALESCE(SUM(revenue_cents),0)::int AS revenue_cents
    FROM artist_revenue
    WHERE downloaded_at >= now() - interval '30 days'
    GROUP BY 1 ORDER BY 1
  ),
  pool_pending AS (
    SELECT
      COALESCE(SUM(
        COALESCE(qc.price_cents::numeric / NULLIF(cs.total_dl_on_card,0), 0)
        * (sc.share_percent / 100.0)
      ),0)::int AS pending_revenue_cents,
      COUNT(*)::int AS pending_downloads
    FROM public.song_collaborators sc
    JOIN public.user_downloads d ON d.song_id = sc.song_id
    LEFT JOIN public.qr_cards qc ON qc.id = d.qr_card_id
    LEFT JOIN card_split cs ON cs.qr_card_id = d.qr_card_id
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
$$;


-- =========================================================================
-- 5) get_pending_collaborations_for_artist
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_pending_collaborations_for_artist()
RETURNS TABLE(
  collaborator_id uuid,
  song_id uuid,
  song_title text,
  song_cover_url text,
  artist_name text,
  share_percent numeric,
  estimated_revenue_cents int,
  downloads int,
  has_pending_claim boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

  RETURN QUERY
  WITH my_names AS (
    SELECT lower(ar.artist_name) AS lname
    FROM public.artist_requests ar
    WHERE ar.user_id = v_uid AND ar.status = 'approved'
  ),
  card_split AS (
    SELECT qr_card_id, COUNT(*) AS total_dl
    FROM public.user_downloads
    WHERE qr_card_id IS NOT NULL GROUP BY qr_card_id
  )
  SELECT
    sc.id,
    s.id,
    s.title,
    s.cover_url,
    sc.artist_name,
    sc.share_percent,
    COALESCE(SUM(
      COALESCE(qc.price_cents::numeric / NULLIF(cs.total_dl,0),0)
      * (sc.share_percent/100.0)
    ),0)::int,
    COUNT(d.id)::int,
    EXISTS(
      SELECT 1 FROM public.collaboration_claims cc
      WHERE cc.collaborator_id = sc.id
        AND cc.claimant_user_id = v_uid
        AND cc.status = 'pending'
    )
  FROM public.song_collaborators sc
  JOIN public.songs s ON s.id = sc.song_id
  LEFT JOIN public.user_downloads d ON d.song_id = s.id
  LEFT JOIN public.qr_cards qc ON qc.id = d.qr_card_id
  LEFT JOIN card_split cs ON cs.qr_card_id = d.qr_card_id
  WHERE sc.song_id IS NOT NULL
    AND sc.claimed_by_user_id IS NULL
    AND lower(sc.artist_name) IN (SELECT lname FROM my_names)
  GROUP BY sc.id, s.id, s.title, s.cover_url, sc.artist_name, sc.share_percent;
END;
$$;


-- =========================================================================
-- 6) claim_collaboration
-- =========================================================================
CREATE OR REPLACE FUNCTION public.claim_collaboration(p_collaborator_id uuid, p_message text DEFAULT NULL)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_collab public.song_collaborators%ROWTYPE;
  v_my_name text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT false, 'Debes iniciar sesión'::text; RETURN;
  END IF;

  IF NOT public.has_role(v_uid, 'artist') THEN
    RETURN QUERY SELECT false, 'Solo artistas verificados pueden reclamar'::text; RETURN;
  END IF;

  SELECT * INTO v_collab FROM public.song_collaborators WHERE id = p_collaborator_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Colaboración no encontrada'::text; RETURN;
  END IF;

  IF v_collab.claimed_by_user_id IS NOT NULL THEN
    RETURN QUERY SELECT false, 'Esta colaboración ya está asignada'::text; RETURN;
  END IF;

  SELECT ar.artist_name INTO v_my_name
  FROM public.artist_requests ar
  WHERE ar.user_id = v_uid
    AND ar.status = 'approved'
    AND lower(ar.artist_name) = lower(v_collab.artist_name)
  LIMIT 1;

  IF v_my_name IS NULL THEN
    RETURN QUERY SELECT false, 'Tu nombre artístico no coincide con esta colaboración'::text; RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.collaboration_claims
    WHERE collaborator_id = p_collaborator_id
      AND claimant_user_id = v_uid
      AND status = 'pending'
  ) THEN
    RETURN QUERY SELECT false, 'Ya tienes una solicitud pendiente para esta colaboración'::text; RETURN;
  END IF;

  INSERT INTO public.collaboration_claims (collaborator_id, claimant_user_id, claimant_artist_name, message)
  VALUES (p_collaborator_id, v_uid, v_my_name, p_message);

  RETURN QUERY SELECT true, 'Solicitud enviada. Un administrador la revisará.'::text;
END;
$$;


-- =========================================================================
-- 7) resolve_collaboration_claim
-- =========================================================================
CREATE OR REPLACE FUNCTION public.resolve_collaboration_claim(
  p_claim_id uuid,
  p_approve boolean,
  p_reason text DEFAULT NULL
)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_claim public.collaboration_claims%ROWTYPE;
  v_collab public.song_collaborators%ROWTYPE;
BEGIN
  IF v_admin IS NULL OR NOT public.is_admin(v_admin) THEN
    RETURN QUERY SELECT false, 'No autorizado'::text; RETURN;
  END IF;

  SELECT * INTO v_claim FROM public.collaboration_claims WHERE id = p_claim_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Solicitud no encontrada'::text; RETURN;
  END IF;

  IF v_claim.status <> 'pending' THEN
    RETURN QUERY SELECT false, 'Solicitud ya procesada'::text; RETURN;
  END IF;

  SELECT * INTO v_collab FROM public.song_collaborators WHERE id = v_claim.collaborator_id FOR UPDATE;

  IF p_approve THEN
    IF v_collab.claimed_by_user_id IS NOT NULL THEN
      RETURN QUERY SELECT false, 'Esta colaboración fue asignada a otro usuario'::text; RETURN;
    END IF;

    UPDATE public.song_collaborators
    SET claimed_by_user_id = v_claim.claimant_user_id,
        claimed_at = now()
    WHERE id = v_claim.collaborator_id;

    UPDATE public.collaboration_claims
    SET status = 'approved', reviewed_by = v_admin, reviewed_at = now()
    WHERE id = p_claim_id;

    UPDATE public.collaboration_claims
    SET status = 'rejected',
        reviewed_by = v_admin,
        reviewed_at = now(),
        rejection_reason = 'Asignada a otro usuario'
    WHERE collaborator_id = v_claim.collaborator_id
      AND status = 'pending'
      AND id <> p_claim_id;

    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_claim.claimant_user_id,
      'collab_claim_approved',
      '✅ Reclamación de colaboración aprobada',
      'Tu reclamación de colaboración ha sido aprobada. Ya recibes tu parte de monetización.',
      jsonb_build_object('collaborator_id', v_claim.collaborator_id, 'claim_id', p_claim_id)
    );

    RETURN QUERY SELECT true, 'Reclamación aprobada'::text;
  ELSE
    UPDATE public.collaboration_claims
    SET status = 'rejected',
        reviewed_by = v_admin,
        reviewed_at = now(),
        rejection_reason = p_reason
    WHERE id = p_claim_id;

    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_claim.claimant_user_id,
      'collab_claim_rejected',
      'Reclamación de colaboración rechazada',
      COALESCE('Motivo: ' || p_reason, 'Tu reclamación no fue aprobada.'),
      jsonb_build_object('collaborator_id', v_claim.collaborator_id, 'claim_id', p_claim_id, 'reason', p_reason)
    );

    RETURN QUERY SELECT true, 'Reclamación rechazada'::text;
  END IF;
END;
$$;


-- =========================================================================
-- 8) Auto-asignar splits cuando se aprueba un nuevo artista
-- =========================================================================
CREATE OR REPLACE FUNCTION public.auto_assign_collaborator_pool()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    UPDATE public.song_collaborators sc
    SET claimed_by_user_id = NEW.user_id,
        claimed_at = now()
    WHERE sc.song_id IS NOT NULL
      AND sc.claimed_by_user_id IS NULL
      AND lower(sc.artist_name) = lower(NEW.artist_name);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_assign_pool_on_artist_approve ON public.artist_requests;
CREATE TRIGGER trg_auto_assign_pool_on_artist_approve
AFTER UPDATE ON public.artist_requests
FOR EACH ROW EXECUTE FUNCTION public.auto_assign_collaborator_pool();