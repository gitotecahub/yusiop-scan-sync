
-- 1) is_held flag for artist_earnings
ALTER TABLE public.artist_earnings
  ADD COLUMN IF NOT EXISTS is_held boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_artist_earnings_artist_status ON public.artist_earnings(artist_id, status);

-- 2) Function: amount held for an artist by open claims
CREATE OR REPLACE FUNCTION public.get_artist_held_amount(p_artist_id uuid)
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(e.artist_amount_xaf), 0)::bigint
    FROM public.artist_earnings e
   WHERE e.artist_id = p_artist_id
     AND e.status IN ('pending_validation','available')
     AND e.song_id IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM public.collaboration_claims_v2 c
        WHERE c.song_id = e.song_id
          AND c.status IN ('pending','under_review','disputed')
     )
$$;

-- 3) Maintain is_held flag via triggers on claims and on new earnings
CREATE OR REPLACE FUNCTION public.refresh_earnings_hold_for_song(p_song_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  has_open boolean;
BEGIN
  IF p_song_id IS NULL THEN RETURN; END IF;
  SELECT public.has_open_claim_on_song(p_song_id) INTO has_open;
  UPDATE public.artist_earnings
     SET is_held = has_open
   WHERE song_id = p_song_id
     AND status IN ('pending_validation','available')
     AND is_held IS DISTINCT FROM has_open;
END $$;

CREATE OR REPLACE FUNCTION public.trg_claim_refresh_hold()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.refresh_earnings_hold_for_song(NEW.song_id);
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.refresh_earnings_hold_for_song(NEW.song_id);
    IF NEW.song_id IS DISTINCT FROM OLD.song_id THEN
      PERFORM public.refresh_earnings_hold_for_song(OLD.song_id);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_earnings_hold_for_song(OLD.song_id);
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_claim_refresh_hold_aiud ON public.collaboration_claims_v2;
CREATE TRIGGER trg_claim_refresh_hold_aiud
AFTER INSERT OR UPDATE OR DELETE ON public.collaboration_claims_v2
FOR EACH ROW EXECUTE FUNCTION public.trg_claim_refresh_hold();

CREATE OR REPLACE FUNCTION public.trg_earning_set_hold()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.song_id IS NOT NULL THEN
    NEW.is_held := public.has_open_claim_on_song(NEW.song_id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_earning_set_hold_bi ON public.artist_earnings;
CREATE TRIGGER trg_earning_set_hold_bi
BEFORE INSERT ON public.artist_earnings
FOR EACH ROW EXECUTE FUNCTION public.trg_earning_set_hold();

-- Backfill once
UPDATE public.artist_earnings e
   SET is_held = true
 WHERE e.status IN ('pending_validation','available')
   AND e.song_id IS NOT NULL
   AND EXISTS (
     SELECT 1 FROM public.collaboration_claims_v2 c
      WHERE c.song_id = e.song_id
        AND c.status IN ('pending','under_review','disputed')
   );

-- 4) Better risk scoring
CREATE OR REPLACE FUNCTION public.compute_claim_risk_score(p_claim_id uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  c public.collaboration_claims_v2%ROWTYPE;
  ap public.artist_profiles%ROWTYPE;
  score int := 0;
  flags jsonb := '[]'::jsonb;
  total_claims int;
  recent_claims int;
  link_count int;
  conflict_count int;
BEGIN
  SELECT * INTO c FROM public.collaboration_claims_v2 WHERE id = p_claim_id;
  IF NOT FOUND THEN RETURN 0; END IF;
  SELECT * INTO ap FROM public.artist_profiles WHERE user_id = c.claimant_user_id;

  link_count := COALESCE(jsonb_array_length(c.proof_links), 0);

  SELECT count(*) INTO total_claims FROM public.collaboration_claims_v2
   WHERE claimant_user_id = c.claimant_user_id;
  SELECT count(*) INTO recent_claims FROM public.collaboration_claims_v2
   WHERE claimant_user_id = c.claimant_user_id
     AND created_at > now() - interval '7 days';
  SELECT count(*) INTO conflict_count FROM public.collaboration_claims_v2 x
   WHERE x.song_id = c.song_id AND x.id <> c.id
     AND x.participation_type = c.participation_type
     AND x.status IN ('approved','pending','under_review');

  IF ap.verification_status IS DISTINCT FROM 'artist_verified' THEN
    score := score + 30; flags := flags || to_jsonb('not_artist_verified'::text);
  END IF;
  IF ap.artist_code IS NULL OR ap.artist_code <> c.claimant_artist_code THEN
    score := score + 40; flags := flags || to_jsonb('code_mismatch'::text);
  END IF;
  IF NOT COALESCE(ap.email_verified, false) THEN
    score := score + 15; flags := flags || to_jsonb('email_unverified'::text);
  END IF;
  IF NOT COALESCE(ap.phone_verified, false) THEN
    score := score + 10; flags := flags || to_jsonb('phone_unverified'::text);
  END IF;
  IF link_count = 0 THEN score := score + 20; flags := flags || to_jsonb('no_official_link'::text); END IF;
  IF c.document_url IS NULL THEN score := score + 10; flags := flags || to_jsonb('no_document'::text); END IF;
  IF conflict_count > 0 THEN score := score + 35; flags := flags || to_jsonb('conflict_existing_claim'::text); END IF;
  IF recent_claims > 5 THEN score := score + 20; flags := flags || to_jsonb('many_recent_claims'::text); END IF;
  IF total_claims > 20 THEN score := score + 10; flags := flags || to_jsonb('high_claim_volume'::text); END IF;
  IF ap.stage_name IS NULL OR length(ap.stage_name) < 2 THEN
    score := score + 10; flags := flags || to_jsonb('incomplete_profile'::text);
  END IF;

  UPDATE public.collaboration_claims_v2
     SET risk_score = score, risk_flags = flags
   WHERE id = p_claim_id;

  RETURN score;
END $$;

-- 5) Wrap try_auto_approve_claim to also compute risk
CREATE OR REPLACE FUNCTION public.after_claim_v2_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  score int;
BEGIN
  score := public.compute_claim_risk_score(NEW.id);
  IF score >= 50 THEN
    UPDATE public.collaboration_claims_v2
       SET status='under_review'
     WHERE id = NEW.id;
  ELSE
    PERFORM public.try_auto_approve_claim(NEW.id);
  END IF;

  INSERT INTO public.notifications(user_id, type, title, body, data)
  SELECT ur.user_id, 'claim_submitted', 'Nueva reclamación de colaboración',
         'Reclamación de '||NEW.claimant_stage_name||' (score '||score||')',
         jsonb_build_object('claim_id', NEW.id, 'risk_score', score)
    FROM public.user_roles ur WHERE ur.role = 'admin';
  INSERT INTO public.notifications(user_id, type, title, body, data)
  VALUES (NEW.claimant_user_id, 'claim_submitted',
          'Reclamación enviada',
          'Tu reclamación está siendo revisada.',
          jsonb_build_object('claim_id', NEW.id));
  RETURN NEW;
END $$;
