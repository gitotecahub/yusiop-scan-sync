ALTER TABLE public.ad_campaigns
  ADD COLUMN IF NOT EXISTS submission_id uuid NULL;

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_submission_id
  ON public.ad_campaigns(submission_id);

-- Allow admins to read campaigns linked to a submission via existing admin policy (already covers ALL).
-- Allow owners to view their own campaigns is already covered by user_id = auth.uid().