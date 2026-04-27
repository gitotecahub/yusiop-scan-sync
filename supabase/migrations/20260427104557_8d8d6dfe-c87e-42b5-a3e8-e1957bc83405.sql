-- 1) Función para generar lotes de tarjetas recargables
CREATE OR REPLACE FUNCTION public.admin_generate_recharge_cards(
  p_quantity integer,
  p_amount_xaf integer,
  p_batch text DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_codes jsonb := '[]'::jsonb;
  v_code text;
  v_id uuid;
  i integer;
BEGIN
  -- Solo admins
  IF NOT public.is_admin(v_admin_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  -- Validaciones
  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 1000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_quantity');
  END IF;
  IF p_amount_xaf IS NULL OR p_amount_xaf < 100 OR p_amount_xaf > 10000000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
  END IF;
  IF p_expires_at IS NOT NULL AND p_expires_at <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_expiry');
  END IF;

  FOR i IN 1..p_quantity LOOP
    -- Generar código único WAL-XXXXXXXX (8 chars alfanuméricos)
    LOOP
      v_code := 'WAL-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.recharge_cards WHERE code = v_code);
    END LOOP;

    INSERT INTO public.recharge_cards (
      code, amount, currency, status, batch, notes, expires_at, created_by
    ) VALUES (
      v_code, p_amount_xaf, 'XAF', 'active', p_batch, p_notes, p_expires_at, v_admin_id
    ) RETURNING id INTO v_id;

    v_codes := v_codes || jsonb_build_object('id', v_id, 'code', v_code);
  END LOOP;

  -- Audit log
  INSERT INTO public.admin_audit_log (
    actor_user_id, action, entity_type, entity_id, metadata
  ) VALUES (
    v_admin_id, 'generate_recharge_cards', 'recharge_cards', NULL,
    jsonb_build_object(
      'quantity', p_quantity,
      'amount_xaf', p_amount_xaf,
      'batch', p_batch,
      'expires_at', p_expires_at
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'quantity', p_quantity,
    'amount_xaf', p_amount_xaf,
    'batch', p_batch,
    'cards', v_codes
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_generate_recharge_cards(integer, integer, text, timestamptz, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_generate_recharge_cards(integer, integer, text, timestamptz, text) TO authenticated;

-- 2) Función para listar tarjetas (con filtros)
CREATE OR REPLACE FUNCTION public.admin_list_recharge_cards(
  p_status text DEFAULT NULL,
  p_batch text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_rows jsonb;
  v_total integer;
BEGIN
  IF NOT public.is_admin(v_admin_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  SELECT count(*) INTO v_total
  FROM public.recharge_cards rc
  WHERE (p_status IS NULL OR rc.status::text = p_status)
    AND (p_batch IS NULL OR rc.batch = p_batch)
    AND (p_search IS NULL OR rc.code ILIKE '%' || p_search || '%');

  SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_rows FROM (
    SELECT
      rc.id, rc.code, rc.amount, rc.currency, rc.status::text AS status,
      rc.batch, rc.notes, rc.expires_at, rc.used_at, rc.used_by,
      rc.created_at, rc.created_by,
      p.username AS used_by_username,
      p.full_name AS used_by_full_name
    FROM public.recharge_cards rc
    LEFT JOIN public.profiles p ON p.user_id = rc.used_by
    WHERE (p_status IS NULL OR rc.status::text = p_status)
      AND (p_batch IS NULL OR rc.batch = p_batch)
      AND (p_search IS NULL OR rc.code ILIKE '%' || p_search || '%')
    ORDER BY rc.created_at DESC
    LIMIT greatest(p_limit, 1) OFFSET greatest(p_offset, 0)
  ) t;

  RETURN jsonb_build_object('success', true, 'total', v_total, 'cards', v_rows);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_recharge_cards(text, text, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_recharge_cards(text, text, text, integer, integer) TO authenticated;

-- 3) Desactivar tarjeta
CREATE OR REPLACE FUNCTION public.admin_disable_recharge_card(p_card_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_card public.recharge_cards;
BEGIN
  IF NOT public.is_admin(v_admin_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  SELECT * INTO v_card FROM public.recharge_cards WHERE id = p_card_id FOR UPDATE;
  IF v_card.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;
  IF v_card.status = 'used' THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_used');
  END IF;

  UPDATE public.recharge_cards SET status = 'disabled' WHERE id = p_card_id;

  INSERT INTO public.admin_audit_log (actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (v_admin_id, 'disable_recharge_card', 'recharge_cards', p_card_id::text, jsonb_build_object('code', v_card.code));

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_disable_recharge_card(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_disable_recharge_card(uuid) TO authenticated;

-- 4) Reactivar tarjeta
CREATE OR REPLACE FUNCTION public.admin_reactivate_recharge_card(p_card_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_card public.recharge_cards;
BEGIN
  IF NOT public.is_admin(v_admin_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  SELECT * INTO v_card FROM public.recharge_cards WHERE id = p_card_id FOR UPDATE;
  IF v_card.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;
  IF v_card.status = 'used' THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_used');
  END IF;
  IF v_card.expires_at IS NOT NULL AND v_card.expires_at <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'expired');
  END IF;

  UPDATE public.recharge_cards SET status = 'active' WHERE id = p_card_id;

  INSERT INTO public.admin_audit_log (actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (v_admin_id, 'reactivate_recharge_card', 'recharge_cards', p_card_id::text, jsonb_build_object('code', v_card.code));

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reactivate_recharge_card(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reactivate_recharge_card(uuid) TO authenticated;