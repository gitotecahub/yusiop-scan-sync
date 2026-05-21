
-- ENUMS
DO $$ BEGIN
  CREATE TYPE public.artist_verification_status AS ENUM ('unverified','basic_verified','artist_verified','under_review','rejected','suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.participation_type AS ENUM ('singer','composer','producer','beatmaker','featuring','label','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.claim_status_v2 AS ENUM ('pending','under_review','approved','rejected','disputed','blocked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- SEQUENCE for artist_code
CREATE SEQUENCE IF NOT EXISTS public.artist_code_seq START 1;

-- ARTIST PROFILES
CREATE TABLE IF NOT EXISTS public.artist_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  artist_id uuid,
  artist_code text NOT NULL UNIQUE,
  artist_username text NOT NULL UNIQUE,
  legal_name text,
  stage_name text NOT NULL,
  country text,
  phone text,
  phone_verified boolean NOT NULL DEFAULT false,
  email_verified boolean NOT NULL DEFAULT false,
  verification_status public.artist_verification_status NOT NULL DEFAULT 'unverified',
  verified_at timestamptz,
  verified_by uuid,
  rejection_reason text,
  risk_score int NOT NULL DEFAULT 0,
  official_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-fill artist_code
CREATE OR REPLACE FUNCTION public.set_artist_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.artist_code IS NULL OR NEW.artist_code = '' THEN
    NEW.artist_code := 'YUS-ART-' || lpad(nextval('public.artist_code_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_artist_profiles_code ON public.artist_profiles;
CREATE TRIGGER trg_artist_profiles_code BEFORE INSERT ON public.artist_profiles
FOR EACH ROW EXECUTE FUNCTION public.set_artist_code();

-- Protect artist_code and username after verification
CREATE OR REPLACE FUNCTION public.protect_artist_identity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.artist_code IS DISTINCT FROM OLD.artist_code THEN
    IF NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'artist_code is immutable';
    END IF;
  END IF;
  IF OLD.verification_status = 'artist_verified'
     AND NEW.artist_username IS DISTINCT FROM OLD.artist_username
     AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'artist_username locked after verification';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_artist_profiles_protect ON public.artist_profiles;
CREATE TRIGGER trg_artist_profiles_protect BEFORE UPDATE ON public.artist_profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_artist_identity();

ALTER TABLE public.artist_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artist profiles select own or admin" ON public.artist_profiles
FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Artist profiles insert own" ON public.artist_profiles
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Artist profiles update own or admin" ON public.artist_profiles
FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Artist profiles admin delete" ON public.artist_profiles
FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- VERIFICATION REQUESTS
CREATE TABLE IF NOT EXISTS public.artist_verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_profile_id uuid NOT NULL REFERENCES public.artist_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  id_document_url text,
  selfie_url text,
  official_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  country text,
  stage_name text,
  legal_name text,
  phone text,
  email text,
  status public.artist_verification_status NOT NULL DEFAULT 'under_review',
  admin_note text,
  rejection_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.artist_verification_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Verif req select own or admin" ON public.artist_verification_requests
FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Verif req insert own" ON public.artist_verification_requests
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Verif req update own pending or admin" ON public.artist_verification_requests
FOR UPDATE TO authenticated
USING ((user_id = auth.uid() AND status = 'under_review') OR public.is_admin(auth.uid()))
WITH CHECK ((user_id = auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "Verif req admin delete" ON public.artist_verification_requests
FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- CLAIMS V2
CREATE TABLE IF NOT EXISTS public.collaboration_claims_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claimant_user_id uuid NOT NULL,
  claimant_artist_code text NOT NULL,
  claimant_stage_name text NOT NULL,
  song_id uuid REFERENCES public.songs(id) ON DELETE SET NULL,
  song_title_snapshot text,
  participation_type public.participation_type NOT NULL,
  claimed_percent numeric(5,2),
  proof_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  document_url text,
  comment text,
  status public.claim_status_v2 NOT NULL DEFAULT 'pending',
  admin_note text,
  rejection_reason text,
  risk_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_score int NOT NULL DEFAULT 0,
  ip_address text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_claims_v2_song ON public.collaboration_claims_v2(song_id);
CREATE INDEX IF NOT EXISTS idx_claims_v2_user ON public.collaboration_claims_v2(claimant_user_id);
CREATE INDEX IF NOT EXISTS idx_claims_v2_status ON public.collaboration_claims_v2(status);

ALTER TABLE public.collaboration_claims_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Claims v2 select own or admin" ON public.collaboration_claims_v2
FOR SELECT TO authenticated USING (claimant_user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Claims v2 insert own" ON public.collaboration_claims_v2
FOR INSERT TO authenticated WITH CHECK (claimant_user_id = auth.uid());

CREATE POLICY "Claims v2 admin update" ON public.collaboration_claims_v2
FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Claims v2 admin delete" ON public.collaboration_claims_v2
FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- AUDIT LOG
CREATE TABLE IF NOT EXISTS public.claim_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.collaboration_claims_v2(id) ON DELETE CASCADE,
  actor_user_id uuid,
  action text NOT NULL,
  before_state jsonb,
  after_state jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.claim_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audit log admin or owner select" ON public.claim_audit_log
FOR SELECT TO authenticated USING (
  public.is_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.collaboration_claims_v2 c
    WHERE c.id = claim_audit_log.claim_id AND c.claimant_user_id = auth.uid()
  )
);

-- Trigger to log claim changes
CREATE OR REPLACE FUNCTION public.log_claim_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.claim_audit_log(claim_id, actor_user_id, action, after_state)
    VALUES (NEW.id, auth.uid(), 'created', to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.claim_audit_log(claim_id, actor_user_id, action, before_state, after_state, note)
      VALUES (NEW.id, auth.uid(), 'status_change:' || NEW.status::text, to_jsonb(OLD), to_jsonb(NEW), NEW.admin_note);
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_claim_v2_audit ON public.collaboration_claims_v2;
CREATE TRIGGER trg_claim_v2_audit AFTER INSERT OR UPDATE ON public.collaboration_claims_v2
FOR EACH ROW EXECUTE FUNCTION public.log_claim_change();

-- PHONE OTP (estructura preparada)
CREATE TABLE IF NOT EXISTS public.phone_otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  phone text NOT NULL,
  code_hash text NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.phone_otp_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "OTP own select" ON public.phone_otp_codes FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "OTP own insert" ON public.phone_otp_codes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "OTP own update" ON public.phone_otp_codes FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- AUTO APPROVE CLAIM
CREATE OR REPLACE FUNCTION public.try_auto_approve_claim(p_claim_id uuid)
RETURNS public.claim_status_v2
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  c public.collaboration_claims_v2%ROWTYPE;
  ap public.artist_profiles%ROWTYPE;
  link_count int;
  conflict_count int;
  flags jsonb := '[]'::jsonb;
BEGIN
  SELECT * INTO c FROM public.collaboration_claims_v2 WHERE id = p_claim_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'claim not found'; END IF;

  SELECT * INTO ap FROM public.artist_profiles WHERE user_id = c.claimant_user_id;
  IF NOT FOUND THEN
    flags := flags || to_jsonb('no_artist_profile'::text);
  END IF;

  link_count := COALESCE(jsonb_array_length(c.proof_links), 0);

  SELECT count(*) INTO conflict_count FROM public.collaboration_claims_v2 x
   WHERE x.song_id = c.song_id AND x.id <> c.id
     AND x.participation_type = c.participation_type
     AND x.status IN ('approved','pending','under_review');

  IF ap.verification_status <> 'artist_verified' THEN flags := flags || to_jsonb('not_artist_verified'::text); END IF;
  IF ap.artist_code <> c.claimant_artist_code THEN flags := flags || to_jsonb('code_mismatch'::text); END IF;
  IF NOT ap.email_verified THEN flags := flags || to_jsonb('email_unverified'::text); END IF;
  IF NOT ap.phone_verified THEN flags := flags || to_jsonb('phone_unverified'::text); END IF;
  IF link_count < 1 THEN flags := flags || to_jsonb('no_official_link'::text); END IF;
  IF conflict_count > 0 THEN flags := flags || to_jsonb('conflict_existing_claim'::text); END IF;

  IF jsonb_array_length(flags) = 0 THEN
    UPDATE public.collaboration_claims_v2
       SET status='approved', reviewed_at=now(), risk_flags='[]'::jsonb
     WHERE id = p_claim_id;
    RETURN 'approved'::public.claim_status_v2;
  ELSE
    UPDATE public.collaboration_claims_v2
       SET status='under_review', risk_flags=flags
     WHERE id = p_claim_id;
    RETURN 'under_review'::public.claim_status_v2;
  END IF;
END $$;

-- After insert: try auto approve + notify admin
CREATE OR REPLACE FUNCTION public.after_claim_v2_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM public.try_auto_approve_claim(NEW.id);
  INSERT INTO public.notifications(user_id, type, title, body, data)
  SELECT ur.user_id, 'claim_submitted', 'Nueva reclamación de colaboración',
         'Reclamación de '||NEW.claimant_stage_name||' sobre canción.',
         jsonb_build_object('claim_id', NEW.id)
    FROM public.user_roles ur WHERE ur.role = 'admin';
  INSERT INTO public.notifications(user_id, type, title, body, data)
  VALUES (NEW.claimant_user_id, 'claim_submitted',
          'Reclamación enviada',
          'Tu reclamación está siendo revisada.',
          jsonb_build_object('claim_id', NEW.id));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_claim_v2_after_insert ON public.collaboration_claims_v2;
CREATE TRIGGER trg_claim_v2_after_insert AFTER INSERT ON public.collaboration_claims_v2
FOR EACH ROW EXECUTE FUNCTION public.after_claim_v2_insert();

-- Notify on status change
CREATE OR REPLACE FUNCTION public.after_claim_v2_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications(user_id, type, title, body, data)
    VALUES (NEW.claimant_user_id, 'claim_'||NEW.status::text,
            'Estado de reclamación: '||NEW.status::text,
            COALESCE(NEW.rejection_reason, NEW.admin_note, 'Tu reclamación cambió de estado.'),
            jsonb_build_object('claim_id', NEW.id, 'status', NEW.status));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_claim_v2_status_notify ON public.collaboration_claims_v2;
CREATE TRIGGER trg_claim_v2_status_notify AFTER UPDATE ON public.collaboration_claims_v2
FOR EACH ROW EXECUTE FUNCTION public.after_claim_v2_status();

-- Earnings hold helper
CREATE OR REPLACE FUNCTION public.has_open_claim_on_song(p_song_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.collaboration_claims_v2
     WHERE song_id = p_song_id AND status IN ('pending','under_review','disputed')
  )
$$;

-- Storage bucket for verification docs
INSERT INTO storage.buckets (id, name, public) VALUES ('artist-verification','artist-verification', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Verif docs owner read" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id='artist-verification' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin(auth.uid()))
);
CREATE POLICY "Verif docs owner upload" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id='artist-verification' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Verif docs owner update" ON storage.objects
FOR UPDATE TO authenticated USING (
  bucket_id='artist-verification' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Verif docs admin delete" ON storage.objects
FOR DELETE TO authenticated USING (
  bucket_id='artist-verification' AND public.is_admin(auth.uid())
);
