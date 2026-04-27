-- song_submissions: ampliar UPDATE/DELETE a pending_payment
DROP POLICY IF EXISTS "Users can update their own pending or rejected submissions" ON public.song_submissions;
CREATE POLICY "Users can update their own pending or rejected submissions"
ON public.song_submissions
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  AND status = ANY (ARRAY['pending'::song_submission_status, 'rejected'::song_submission_status, 'pending_payment'::song_submission_status])
)
WITH CHECK (
  auth.uid() = user_id
  AND status = ANY (ARRAY['pending'::song_submission_status, 'rejected'::song_submission_status, 'pending_payment'::song_submission_status])
);

DROP POLICY IF EXISTS "Users can delete their own pending submissions" ON public.song_submissions;
CREATE POLICY "Users can delete their own pending submissions"
ON public.song_submissions
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  AND status = ANY (ARRAY['pending'::song_submission_status, 'pending_payment'::song_submission_status])
);

-- song_collaborators: ampliar a pending_payment
DROP POLICY IF EXISTS "Owner of submission can manage collaborators (insert)" ON public.song_collaborators;
CREATE POLICY "Owner of submission can manage collaborators (insert)"
ON public.song_collaborators
FOR INSERT
TO authenticated
WITH CHECK (
  submission_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM song_submissions s
    WHERE s.id = song_collaborators.submission_id
      AND s.user_id = auth.uid()
      AND s.status = ANY (ARRAY['pending'::song_submission_status, 'rejected'::song_submission_status, 'pending_payment'::song_submission_status])
  )
);

DROP POLICY IF EXISTS "Owner of submission can manage collaborators (update)" ON public.song_collaborators;
CREATE POLICY "Owner of submission can manage collaborators (update)"
ON public.song_collaborators
FOR UPDATE
TO authenticated
USING (
  submission_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM song_submissions s
    WHERE s.id = song_collaborators.submission_id
      AND s.user_id = auth.uid()
      AND s.status = ANY (ARRAY['pending'::song_submission_status, 'rejected'::song_submission_status, 'pending_payment'::song_submission_status])
  )
)
WITH CHECK (
  submission_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM song_submissions s
    WHERE s.id = song_collaborators.submission_id
      AND s.user_id = auth.uid()
      AND s.status = ANY (ARRAY['pending'::song_submission_status, 'rejected'::song_submission_status, 'pending_payment'::song_submission_status])
  )
);

DROP POLICY IF EXISTS "Owner of submission can manage collaborators (delete)" ON public.song_collaborators;
CREATE POLICY "Owner of submission can manage collaborators (delete)"
ON public.song_collaborators
FOR DELETE
TO authenticated
USING (
  submission_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM song_submissions s
    WHERE s.id = song_collaborators.submission_id
      AND s.user_id = auth.uid()
      AND s.status = ANY (ARRAY['pending'::song_submission_status, 'rejected'::song_submission_status, 'pending_payment'::song_submission_status])
  )
);
