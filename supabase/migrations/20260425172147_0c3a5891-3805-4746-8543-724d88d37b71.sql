-- Function: notify all admins when a new subscription is created
CREATE OR REPLACE FUNCTION public.notify_admins_new_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_name TEXT;
  v_plan_price_cents INTEGER;
  v_user_email TEXT;
  v_admin_id UUID;
BEGIN
  -- Get plan info
  SELECT name, price_eur_cents INTO v_plan_name, v_plan_price_cents
  FROM public.subscription_plans
  WHERE id = NEW.plan_id;

  -- Get subscriber email
  SELECT email INTO v_user_email
  FROM public.users
  WHERE id = NEW.user_id;

  -- Insert one notification per admin
  FOR v_admin_id IN
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_admin_id,
      'new_subscription',
      'Nueva suscripción: ' || COALESCE(v_plan_name, 'Plan'),
      COALESCE(v_user_email, 'Un usuario') || ' se ha suscrito a ' || COALESCE(v_plan_name, 'un plan')
        || CASE WHEN v_plan_price_cents IS NOT NULL
             THEN ' (' || to_char(v_plan_price_cents / 100.0, 'FM999990.00') || ' €)'
             ELSE ''
           END,
      jsonb_build_object(
        'subscription_id', NEW.id,
        'user_id', NEW.user_id,
        'user_email', v_user_email,
        'plan_id', NEW.plan_id,
        'plan_name', v_plan_name,
        'price_eur_cents', v_plan_price_cents,
        'status', NEW.status
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Trigger on insert
DROP TRIGGER IF EXISTS trg_notify_admins_new_subscription ON public.user_subscriptions;
CREATE TRIGGER trg_notify_admins_new_subscription
AFTER INSERT ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_new_subscription();