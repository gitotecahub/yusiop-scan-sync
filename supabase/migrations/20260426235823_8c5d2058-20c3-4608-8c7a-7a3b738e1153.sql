
-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE public.wallet_transaction_type AS ENUM (
  'recharge',
  'purchase',
  'refund',
  'bonus',
  'adjustment'
);

CREATE TYPE public.wallet_transaction_status AS ENUM (
  'pending',
  'completed',
  'failed',
  'reversed'
);

CREATE TYPE public.recharge_card_status AS ENUM (
  'active',
  'used',
  'expired',
  'disabled'
);

-- ============================================================
-- TABLE: user_wallets
-- ============================================================
CREATE TABLE public.user_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance numeric(14,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  currency text NOT NULL DEFAULT 'XAF',
  total_recharged numeric(14,2) NOT NULL DEFAULT 0,
  total_spent numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_wallets_user_id ON public.user_wallets(user_id);

ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wallet"
  ON public.user_wallets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all wallets"
  ON public.user_wallets FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage wallets"
  ON public.user_wallets FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- ============================================================
-- TABLE: wallet_transactions
-- ============================================================
CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  wallet_id uuid NOT NULL REFERENCES public.user_wallets(id) ON DELETE CASCADE,
  type public.wallet_transaction_type NOT NULL,
  amount numeric(14,2) NOT NULL,
  balance_after numeric(14,2) NOT NULL,
  status public.wallet_transaction_status NOT NULL DEFAULT 'completed',
  reference text,
  payment_method text,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  related_song_id uuid,
  related_card_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wallet_tx_user_id ON public.wallet_transactions(user_id, created_at DESC);
CREATE INDEX idx_wallet_tx_wallet_id ON public.wallet_transactions(wallet_id, created_at DESC);
CREATE INDEX idx_wallet_tx_type ON public.wallet_transactions(type);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions"
  ON public.wallet_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions"
  ON public.wallet_transactions FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage transactions"
  ON public.wallet_transactions FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- ============================================================
-- TABLE: recharge_cards
-- ============================================================
CREATE TABLE public.recharge_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'XAF',
  status public.recharge_card_status NOT NULL DEFAULT 'active',
  batch text,
  notes text,
  expires_at timestamptz,
  used_at timestamptz,
  used_by uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_recharge_cards_code ON public.recharge_cards(code);
CREATE INDEX idx_recharge_cards_status ON public.recharge_cards(status);
CREATE INDEX idx_recharge_cards_batch ON public.recharge_cards(batch);

ALTER TABLE public.recharge_cards ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver/gestionar tarjetas. Los usuarios validan vía RPC.
CREATE POLICY "Admins manage recharge cards"
  ON public.recharge_cards FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- ============================================================
-- TRIGGER: actualizar updated_at del wallet
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_wallet_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_user_wallets_updated_at
  BEFORE UPDATE ON public.user_wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_wallet_updated_at();

-- ============================================================
-- FUNCTION: get_or_create_wallet (interno)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_or_create_wallet(p_user_id uuid)
RETURNS public.user_wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet public.user_wallets;
BEGIN
  SELECT * INTO v_wallet FROM public.user_wallets WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    INSERT INTO public.user_wallets (user_id) VALUES (p_user_id)
    RETURNING * INTO v_wallet;
  END IF;
  RETURN v_wallet;
END;
$$;

-- ============================================================
-- FUNCTION: redeem_recharge_card
-- ============================================================
CREATE OR REPLACE FUNCTION public.redeem_recharge_card(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_card public.recharge_cards;
  v_wallet public.user_wallets;
  v_new_balance numeric(14,2);
  v_tx_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthenticated');
  END IF;

  -- Normalizar código (trim + uppercase)
  p_code := upper(trim(p_code));

  -- Bloquear la fila para evitar doble uso
  SELECT * INTO v_card
  FROM public.recharge_cards
  WHERE code = p_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;

  IF v_card.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'card_' || v_card.status::text);
  END IF;

  IF v_card.expires_at IS NOT NULL AND v_card.expires_at < now() THEN
    UPDATE public.recharge_cards SET status = 'expired' WHERE id = v_card.id;
    RETURN jsonb_build_object('success', false, 'error', 'card_expired');
  END IF;

  -- Asegurar wallet
  v_wallet := public.get_or_create_wallet(v_user_id);

  -- Sumar saldo
  UPDATE public.user_wallets
  SET balance = balance + v_card.amount,
      total_recharged = total_recharged + v_card.amount
  WHERE id = v_wallet.id
  RETURNING balance INTO v_new_balance;

  -- Marcar tarjeta como usada
  UPDATE public.recharge_cards
  SET status = 'used',
      used_at = now(),
      used_by = v_user_id
  WHERE id = v_card.id;

  -- Registrar transacción
  INSERT INTO public.wallet_transactions (
    user_id, wallet_id, type, amount, balance_after, status,
    reference, payment_method, description, related_card_id
  ) VALUES (
    v_user_id, v_wallet.id, 'recharge', v_card.amount, v_new_balance, 'completed',
    v_card.code, 'recharge_card',
    'Recarga con tarjeta ' || v_card.code, v_card.id
  )
  RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object(
    'success', true,
    'amount', v_card.amount,
    'currency', v_card.currency,
    'new_balance', v_new_balance,
    'transaction_id', v_tx_id
  );
END;
$$;

-- ============================================================
-- FUNCTION: wallet_consume_for_download
-- ============================================================
CREATE OR REPLACE FUNCTION public.wallet_consume_for_download(
  p_song_id uuid,
  p_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_wallet public.user_wallets;
  v_new_balance numeric(14,2);
  v_tx_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthenticated');
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
  END IF;

  -- Bloquear wallet
  SELECT * INTO v_wallet
  FROM public.user_wallets
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    v_wallet := public.get_or_create_wallet(v_user_id);
    SELECT * INTO v_wallet FROM public.user_wallets WHERE id = v_wallet.id FOR UPDATE;
  END IF;

  IF v_wallet.balance < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_funds',
      'balance', v_wallet.balance,
      'required', p_amount
    );
  END IF;

  UPDATE public.user_wallets
  SET balance = balance - p_amount,
      total_spent = total_spent + p_amount
  WHERE id = v_wallet.id
  RETURNING balance INTO v_new_balance;

  INSERT INTO public.wallet_transactions (
    user_id, wallet_id, type, amount, balance_after, status,
    payment_method, description, related_song_id
  ) VALUES (
    v_user_id, v_wallet.id, 'purchase', -p_amount, v_new_balance, 'completed',
    'wallet', 'Descarga de canción', p_song_id
  )
  RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'transaction_id', v_tx_id
  );
END;
$$;

-- ============================================================
-- FUNCTION: get_wallet_summary
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_wallet_summary(p_limit integer DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_wallet public.user_wallets;
  v_transactions jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthenticated');
  END IF;

  v_wallet := public.get_or_create_wallet(v_user_id);

  SELECT COALESCE(jsonb_agg(t ORDER BY t.created_at DESC), '[]'::jsonb)
  INTO v_transactions
  FROM (
    SELECT id, type, amount, balance_after, status, reference,
           payment_method, description, created_at
    FROM public.wallet_transactions
    WHERE user_id = v_user_id
    ORDER BY created_at DESC
    LIMIT p_limit
  ) t;

  RETURN jsonb_build_object(
    'wallet', jsonb_build_object(
      'id', v_wallet.id,
      'balance', v_wallet.balance,
      'currency', v_wallet.currency,
      'total_recharged', v_wallet.total_recharged,
      'total_spent', v_wallet.total_spent,
      'updated_at', v_wallet.updated_at
    ),
    'transactions', v_transactions
  );
END;
$$;

-- ============================================================
-- FUNCTION: admin_generate_recharge_cards
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_generate_recharge_cards(
  p_amount numeric,
  p_quantity integer,
  p_batch text DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_codes text[] := ARRAY[]::text[];
  v_code text;
  i integer;
BEGIN
  IF NOT is_admin(v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  IF p_amount <= 0 OR p_quantity <= 0 OR p_quantity > 1000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_params');
  END IF;

  FOR i IN 1..p_quantity LOOP
    -- Código tipo: WAL-XXXXXXXX (8 caracteres alfanuméricos en mayúscula)
    v_code := 'WAL-' || upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8));
    INSERT INTO public.recharge_cards (code, amount, batch, expires_at, created_by)
    VALUES (v_code, p_amount, p_batch, p_expires_at, v_user_id);
    v_codes := array_append(v_codes, v_code);
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'quantity', p_quantity,
    'amount', p_amount,
    'codes', to_jsonb(v_codes)
  );
END;
$$;
