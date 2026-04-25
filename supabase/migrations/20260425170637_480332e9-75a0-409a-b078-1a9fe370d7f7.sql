-- ============================================================
-- Email infrastructure for transactional emails
-- ============================================================

-- 1. Required extensions
CREATE EXTENSION IF NOT EXISTS pgmq;

-- 2. Tables
-- ------------------------------------------------------------

-- 2.1 suppressed_emails: block list
CREATE TABLE IF NOT EXISTS public.suppressed_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL DEFAULT 'unsubscribe',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suppressed_emails_email ON public.suppressed_emails(email);

ALTER TABLE public.suppressed_emails ENABLE ROW LEVEL SECURITY;

-- Append-only: no SELECT/UPDATE/DELETE policies for non-service roles.
-- Service role bypasses RLS automatically.

-- 2.2 email_unsubscribe_tokens: one token per recipient email
CREATE TABLE IF NOT EXISTS public.email_unsubscribe_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_unsubscribe_tokens_token ON public.email_unsubscribe_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_unsubscribe_tokens_email ON public.email_unsubscribe_tokens(email);

ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;

-- 2.3 email_send_log: append-only audit trail
CREATE TABLE IF NOT EXISTS public.email_send_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id TEXT,
  template_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_send_log_message_id ON public.email_send_log(message_id);
CREATE INDEX IF NOT EXISTS idx_email_send_log_recipient ON public.email_send_log(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_send_log_created_at ON public.email_send_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_send_log_status ON public.email_send_log(status);

ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

-- 2.4 email_send_state: dispatcher config (single row)
CREATE TABLE IF NOT EXISTS public.email_send_state (
  id INTEGER PRIMARY KEY DEFAULT 1,
  batch_size INTEGER NOT NULL DEFAULT 10,
  send_delay_ms INTEGER NOT NULL DEFAULT 200,
  visibility_timeout_seconds INTEGER NOT NULL DEFAULT 30,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  auth_email_ttl_minutes INTEGER NOT NULL DEFAULT 15,
  transactional_email_ttl_minutes INTEGER NOT NULL DEFAULT 60,
  rate_limit_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT email_send_state_singleton CHECK (id = 1)
);

ALTER TABLE public.email_send_state ENABLE ROW LEVEL SECURITY;

-- Seed singleton row
INSERT INTO public.email_send_state (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- 3. pgmq queues
-- ------------------------------------------------------------

DO $$
BEGIN
  -- Main queues
  PERFORM pgmq.create('auth_emails');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM pgmq.create('transactional_emails');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM pgmq.create('auth_emails_dlq');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM pgmq.create('transactional_emails_dlq');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 4. RPC wrappers (SECURITY DEFINER so service role + anon can call,
--    but they only do useful work when called via service role).
-- ------------------------------------------------------------

-- 4.1 enqueue_email
CREATE OR REPLACE FUNCTION public.enqueue_email(
  queue_name TEXT,
  payload JSONB
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq
AS $$
DECLARE
  msg_id BIGINT;
BEGIN
  IF queue_name NOT IN ('auth_emails', 'transactional_emails') THEN
    RAISE EXCEPTION 'Invalid queue name: %', queue_name;
  END IF;
  SELECT pgmq.send(queue_name, payload) INTO msg_id;
  RETURN msg_id;
END;
$$;

-- 4.2 read_email_batch
CREATE OR REPLACE FUNCTION public.read_email_batch(
  queue_name TEXT,
  batch_size INTEGER DEFAULT 10,
  visibility_timeout INTEGER DEFAULT 30
)
RETURNS TABLE (
  msg_id BIGINT,
  read_ct INTEGER,
  enqueued_at TIMESTAMPTZ,
  vt TIMESTAMPTZ,
  message JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq
AS $$
BEGIN
  IF queue_name NOT IN ('auth_emails', 'transactional_emails') THEN
    RAISE EXCEPTION 'Invalid queue name: %', queue_name;
  END IF;
  RETURN QUERY
  SELECT q.msg_id, q.read_ct, q.enqueued_at, q.vt, q.message
  FROM pgmq.read(queue_name, visibility_timeout, batch_size) q;
END;
$$;

-- 4.3 delete_email
CREATE OR REPLACE FUNCTION public.delete_email(
  queue_name TEXT,
  msg_id BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq
AS $$
DECLARE
  result BOOLEAN;
BEGIN
  IF queue_name NOT IN ('auth_emails', 'transactional_emails') THEN
    RAISE EXCEPTION 'Invalid queue name: %', queue_name;
  END IF;
  SELECT pgmq.delete(queue_name, msg_id) INTO result;
  RETURN result;
END;
$$;

-- 4.4 move_to_dlq
CREATE OR REPLACE FUNCTION public.move_to_dlq(
  source_queue TEXT,
  msg_id BIGINT,
  payload JSONB
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq
AS $$
DECLARE
  dlq_name TEXT;
  new_msg_id BIGINT;
BEGIN
  IF source_queue NOT IN ('auth_emails', 'transactional_emails') THEN
    RAISE EXCEPTION 'Invalid queue name: %', source_queue;
  END IF;
  dlq_name := source_queue || '_dlq';
  SELECT pgmq.send(dlq_name, payload) INTO new_msg_id;
  PERFORM pgmq.delete(source_queue, msg_id);
  RETURN new_msg_id;
END;
$$;

-- Restrict execute to service_role only (anon/authenticated cannot call)
REVOKE ALL ON FUNCTION public.enqueue_email(TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.read_email_batch(TEXT, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_email(TEXT, BIGINT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.move_to_dlq(TEXT, BIGINT, JSONB) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.enqueue_email(TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(TEXT, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(TEXT, BIGINT) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(TEXT, BIGINT, JSONB) TO service_role;