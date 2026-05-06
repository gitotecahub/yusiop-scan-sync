CREATE TABLE public.welcome_emails_sent (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.welcome_emails_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own welcome record"
  ON public.welcome_emails_sent FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);