-- Trigger BEFORE INSERT: bloquear ownership claims si el catálogo ya está reclamado
CREATE OR REPLACE FUNCTION public.guard_ownership_claim()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_existing uuid;
BEGIN
  IF NEW.participation_type = 'artist_ownership' AND NEW.target_artist_id IS NOT NULL THEN
    SELECT user_id INTO v_existing
    FROM public.artist_profiles
    WHERE artist_id = NEW.target_artist_id
    LIMIT 1;
    IF v_existing IS NOT NULL AND v_existing <> NEW.claimant_user_id THEN
      RAISE EXCEPTION 'Este artista ya está vinculado a otro usuario verificado';
    END IF;
    -- Forzar revisión manual siempre
    NEW.status := 'under_review';
    NEW.risk_score := GREATEST(COALESCE(NEW.risk_score, 0), 60);
    NEW.risk_flags := COALESCE(NEW.risk_flags, '[]'::jsonb) || '["ownership_claim"]'::jsonb;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_ownership_claim ON public.collaboration_claims_v2;
CREATE TRIGGER trg_guard_ownership_claim
BEFORE INSERT ON public.collaboration_claims_v2
FOR EACH ROW EXECUTE FUNCTION public.guard_ownership_claim();