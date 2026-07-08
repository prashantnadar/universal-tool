-- Phase 2: Usage limits, enforcement, admin bootstrap

-- 1) Admin bootstrap allowlist trigger (verified emails only)
CREATE OR REPLACE FUNCTION public.grant_admin_for_bootstrap()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL
     AND lower(NEW.email) IN ('prashantnadar18@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_grant_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_admin
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.grant_admin_for_bootstrap();

DROP TRIGGER IF EXISTS on_auth_user_confirmed_grant_admin ON auth.users;
CREATE TRIGGER on_auth_user_confirmed_grant_admin
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.grant_admin_for_bootstrap();

-- 2) tool_usage indexes for scale
CREATE INDEX IF NOT EXISTS idx_tool_usage_user_id ON public.tool_usage (user_id);
CREATE INDEX IF NOT EXISTS idx_tool_usage_tool_slug ON public.tool_usage (tool_slug);
CREATE INDEX IF NOT EXISTS idx_tool_usage_created_at ON public.tool_usage (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tool_usage_user_created ON public.tool_usage (user_id, created_at DESC);

-- 3) Guest usage tracking
CREATE TABLE IF NOT EXISTS public.guest_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_hash text NOT NULL,
  tool_slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_guest_usage_hash_created ON public.guest_usage (guest_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guest_usage_created_at ON public.guest_usage (created_at DESC);
GRANT ALL ON public.guest_usage TO service_role;
ALTER TABLE public.guest_usage ENABLE ROW LEVEL SECURITY;

-- 4) Plan limits
CREATE TABLE IF NOT EXISTS public.plan_limits (
  plan text PRIMARY KEY,
  daily_limit integer NOT NULL
);
GRANT SELECT ON public.plan_limits TO authenticated, anon;
GRANT ALL ON public.plan_limits TO service_role;
ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plan_limits readable by all" ON public.plan_limits;
CREATE POLICY "plan_limits readable by all" ON public.plan_limits FOR SELECT USING (true);

INSERT INTO public.plan_limits (plan, daily_limit) VALUES
  ('guest', 3), ('free', 10), ('premium', -1), ('admin', -1)
ON CONFLICT (plan) DO UPDATE SET daily_limit = EXCLUDED.daily_limit;

-- 5) Effective plan
CREATE OR REPLACE FUNCTION public.get_effective_plan(_user_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _plan text;
BEGIN
  IF _user_id IS NULL THEN RETURN 'guest'; END IF;
  IF public.has_role(_user_id, 'admin') THEN RETURN 'admin'; END IF;
  SELECT plan::text INTO _plan FROM public.subscriptions
    WHERE user_id = _user_id AND status = 'active'
    ORDER BY created_at DESC LIMIT 1;
  RETURN COALESCE(_plan, 'free');
END;
$$;

-- 6) Atomic check + record
CREATE OR REPLACE FUNCTION public.check_and_record_usage(_tool_slug text, _guest_hash text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _plan text; _limit int; _used int;
  _since timestamptz := (now() - interval '24 hours');
BEGIN
  _plan := public.get_effective_plan(_uid);
  SELECT daily_limit INTO _limit FROM public.plan_limits WHERE plan = _plan;
  IF _limit IS NULL THEN _limit := 0; END IF;

  IF _uid IS NOT NULL THEN
    SELECT count(*) INTO _used FROM public.tool_usage WHERE user_id = _uid AND created_at >= _since;
  ELSE
    IF _guest_hash IS NULL OR length(_guest_hash) < 8 THEN
      RETURN jsonb_build_object('allowed', false, 'used', 0, 'limit', _limit,
        'plan', _plan, 'remaining', 0, 'error', 'missing_guest_hash');
    END IF;
    SELECT count(*) INTO _used FROM public.guest_usage WHERE guest_hash = _guest_hash AND created_at >= _since;
  END IF;

  IF _limit >= 0 AND _used >= _limit THEN
    RETURN jsonb_build_object('allowed', false, 'used', _used, 'limit', _limit,
      'plan', _plan, 'remaining', 0);
  END IF;

  IF _uid IS NOT NULL THEN
    INSERT INTO public.tool_usage (user_id, tool_slug) VALUES (_uid, _tool_slug);
  ELSE
    INSERT INTO public.guest_usage (guest_hash, tool_slug) VALUES (_guest_hash, _tool_slug);
  END IF;

  RETURN jsonb_build_object('allowed', true, 'used', _used+1, 'limit', _limit,
    'plan', _plan, 'remaining', CASE WHEN _limit < 0 THEN -1 ELSE _limit - (_used+1) END);
END;
$$;
REVOKE ALL ON FUNCTION public.check_and_record_usage(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.check_and_record_usage(text, text) TO authenticated, anon;

-- 7) Read-only status
CREATE OR REPLACE FUNCTION public.get_usage_status(_guest_hash text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _plan text; _limit int; _used int := 0;
  _since timestamptz := (now() - interval '24 hours');
BEGIN
  _plan := public.get_effective_plan(_uid);
  SELECT daily_limit INTO _limit FROM public.plan_limits WHERE plan = _plan;
  IF _uid IS NOT NULL THEN
    SELECT count(*) INTO _used FROM public.tool_usage WHERE user_id = _uid AND created_at >= _since;
  ELSIF _guest_hash IS NOT NULL THEN
    SELECT count(*) INTO _used FROM public.guest_usage WHERE guest_hash = _guest_hash AND created_at >= _since;
  END IF;
  RETURN jsonb_build_object('plan', _plan, 'used', _used, 'limit', _limit,
    'remaining', CASE WHEN _limit < 0 THEN -1 ELSE GREATEST(_limit - _used, 0) END);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_usage_status(text) TO authenticated, anon;

-- 8) Admin RPCs
CREATE OR REPLACE FUNCTION public.admin_list_users(_limit int DEFAULT 100, _offset int DEFAULT 0)
RETURNS TABLE(user_id uuid, email text, display_name text, plan text, is_admin boolean, created_at timestamptz, usage_24h bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT p.id, p.email, p.display_name,
    COALESCE((SELECT s.plan::text FROM public.subscriptions s WHERE s.user_id = p.id AND s.status='active' ORDER BY s.created_at DESC LIMIT 1),'free'),
    public.has_role(p.id,'admin'), p.created_at,
    (SELECT count(*) FROM public.tool_usage tu WHERE tu.user_id = p.id AND tu.created_at >= now()-interval '24 hours')
  FROM public.profiles p ORDER BY p.created_at DESC LIMIT _limit OFFSET _offset;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_list_users(int, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_plan(_target uuid, _plan plan_type)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.subscriptions SET plan = _plan, updated_at = now() WHERE user_id = _target;
  IF NOT FOUND THEN
    INSERT INTO public.subscriptions (user_id, plan, status) VALUES (_target, _plan, 'active');
  END IF;
  INSERT INTO public.audit_logs (user_id, action, metadata)
    VALUES (auth.uid(), 'admin_set_plan', jsonb_build_object('target',_target,'plan',_plan));
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_set_plan(uuid, plan_type) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_role(_target uuid, _role app_role, _grant boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _grant THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_target, _role) ON CONFLICT DO NOTHING;
  ELSE
    IF _role = 'admin' AND (SELECT count(*) FROM public.user_roles WHERE role='admin') <= 1 THEN
      RAISE EXCEPTION 'cannot_remove_last_admin';
    END IF;
    DELETE FROM public.user_roles WHERE user_id = _target AND role = _role;
  END IF;
  INSERT INTO public.audit_logs (user_id, action, metadata)
    VALUES (auth.uid(), 'admin_set_role', jsonb_build_object('target',_target,'role',_role,'grant',_grant));
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_set_role(uuid, app_role, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _r jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_build_object(
    'total_users', (SELECT count(*) FROM public.profiles),
    'premium_users', (SELECT count(*) FROM public.subscriptions WHERE plan='premium' AND status='active'),
    'admins', (SELECT count(*) FROM public.user_roles WHERE role='admin'),
    'usage_24h', (SELECT count(*) FROM public.tool_usage WHERE created_at >= now()-interval '24 hours'),
    'usage_7d', (SELECT count(*) FROM public.tool_usage WHERE created_at >= now()-interval '7 days'),
    'guest_usage_24h', (SELECT count(*) FROM public.guest_usage WHERE created_at >= now()-interval '24 hours'),
    'top_tools_24h', (SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) FROM (
      SELECT tool_slug, count(*) as uses FROM public.tool_usage
       WHERE created_at >= now()-interval '24 hours'
       GROUP BY tool_slug ORDER BY uses DESC LIMIT 10
    ) x)
  ) INTO _r;
  RETURN _r;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_stats() TO authenticated;

-- 9) Maintenance
CREATE OR REPLACE FUNCTION public.prune_guest_usage()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.guest_usage WHERE created_at < now() - interval '7 days';
$$;