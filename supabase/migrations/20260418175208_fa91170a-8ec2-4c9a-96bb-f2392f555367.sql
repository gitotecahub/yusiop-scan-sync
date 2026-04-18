CREATE POLICY "Users can delete their own downloads"
ON public.user_downloads
FOR DELETE
USING (
  ((user_email)::text = auth.email()) OR (user_id = auth.uid())
);