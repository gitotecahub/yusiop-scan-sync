-- ============================================================
-- SPRINT 2 — HARDENING CRÍTICO PRE-LANZAMIENTO
-- ============================================================

-- 1) ELIMINAR POLÍTICAS LEGACY DEL BUCKET songs
DROP POLICY IF EXISTS "Songs bucket is publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Songs public read" ON storage.objects;

-- 2) AUTO-CREACIÓN DE WALLET EN SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_wallets (user_id, balance, currency, total_recharged, total_spent)
  VALUES (NEW.id, 0, 'XAF', 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_wallet ON auth.users;
CREATE TRIGGER on_auth_user_created_wallet
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_wallet();

-- Backfill: crear wallet para usuarios existentes sin wallet
INSERT INTO public.user_wallets (user_id, balance, currency, total_recharged, total_spent)
SELECT u.id, 0, 'XAF', 0, 0
FROM auth.users u
LEFT JOIN public.user_wallets w ON w.user_id = u.id
WHERE w.id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- 3) RECONCILIACIÓN DE PAGOS STRIPE EXPIRADOS
CREATE OR REPLACE FUNCTION public.expire_stale_card_purchases()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE card_purchases
  SET status = 'expired',
      updated_at = now()
  WHERE status = 'pending'
    AND created_at < now() - interval '30 minutes';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 4) AUDIT LOG DE ACCIONES ADMIN
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  actor_email text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_actor ON public.admin_audit_log(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.admin_audit_log(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.admin_audit_log(action, created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden leer (no se permite UPDATE ni DELETE para inmutabilidad)
DROP POLICY IF EXISTS "Admins can view audit log" ON public.admin_audit_log;
CREATE POLICY "Admins can view audit log"
ON public.admin_audit_log
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- INSERT solo desde funciones SECURITY DEFINER (sin policy de insert para usuarios)

-- Helper para registrar
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action text,
  p_entity_type text,
  p_entity_id text DEFAULT NULL,
  p_before jsonb DEFAULT NULL,
  p_after jsonb DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_email text;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  INSERT INTO admin_audit_log (
    actor_user_id, actor_email, action, entity_type, entity_id,
    before_state, after_state, metadata
  ) VALUES (
    auth.uid(), v_email, p_action, p_entity_type, p_entity_id,
    p_before, p_after, p_metadata
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Trigger genérico para tablas críticas
CREATE OR REPLACE FUNCTION public.audit_admin_table_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_entity_id text;
  v_before jsonb;
  v_after jsonb;
BEGIN
  -- Solo registrar si el actor es admin (acciones automatizadas/sistema no se loguean)
  IF auth.uid() IS NULL OR NOT is_admin(auth.uid()) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_action := TG_OP || '_' || TG_TABLE_NAME;
  IF TG_OP = 'DELETE' THEN
    v_entity_id := OLD.id::text;
    v_before := to_jsonb(OLD);
    v_after := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    v_entity_id := NEW.id::text;
    v_before := to_jsonb(OLD);
    v_after := to_jsonb(NEW);
  ELSE
    v_entity_id := NEW.id::text;
    v_before := NULL;
    v_after := to_jsonb(NEW);
  END IF;

  PERFORM log_admin_action(v_action, TG_TABLE_NAME, v_entity_id, v_before, v_after);
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Aplicar a tablas sensibles
DROP TRIGGER IF EXISTS audit_recharge_cards ON public.recharge_cards;
CREATE TRIGGER audit_recharge_cards
  AFTER INSERT OR UPDATE OR DELETE ON public.recharge_cards
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_table_changes();

DROP TRIGGER IF EXISTS audit_qr_cards ON public.qr_cards;
CREATE TRIGGER audit_qr_cards
  AFTER INSERT OR UPDATE OR DELETE ON public.qr_cards
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_table_changes();

DROP TRIGGER IF EXISTS audit_withdrawal_requests ON public.artist_withdrawal_requests;
CREATE TRIGGER audit_withdrawal_requests
  AFTER UPDATE OR DELETE ON public.artist_withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_table_changes();

DROP TRIGGER IF EXISTS audit_financial_settings ON public.admin_financial_settings;
CREATE TRIGGER audit_financial_settings
  AFTER UPDATE ON public.admin_financial_settings
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_table_changes();

DROP TRIGGER IF EXISTS audit_user_roles ON public.user_roles;
CREATE TRIGGER audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_table_changes();

DROP TRIGGER IF EXISTS audit_staff_permissions ON public.staff_permissions;
CREATE TRIGGER audit_staff_permissions
  AFTER INSERT OR DELETE ON public.staff_permissions
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_table_changes();

-- 5) ASEGURAR pg_cron y pg_net habilitados
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 6) CRON: liberar earnings cada hora
SELECT cron.unschedule('release-pending-earnings') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'release-pending-earnings');
SELECT cron.schedule(
  'release-pending-earnings',
  '0 * * * *',
  $$ SELECT public.release_pending_earnings(); $$
);

-- 7) CRON: expirar pagos Stripe stale cada 15 min
SELECT cron.unschedule('expire-stale-card-purchases') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-stale-card-purchases');
SELECT cron.schedule(
  'expire-stale-card-purchases',
  '*/15 * * * *',
  $$ SELECT public.expire_stale_card_purchases(); $$
);