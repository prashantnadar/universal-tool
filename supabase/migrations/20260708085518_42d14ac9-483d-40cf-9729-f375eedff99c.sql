
-- 1) Country code columns (best-effort, nullable)
ALTER TABLE public.tool_usage ADD COLUMN IF NOT EXISTS country_code text;
ALTER TABLE public.guest_usage ADD COLUMN IF NOT EXISTS country_code text;

-- 2) Extend check_and_record_usage with optional _country_code (backward compatible)
CREATE OR REPLACE FUNCTION public.check_and_record_usage(
  _tool_slug text,
  _idempotency_key uuid,
  _guest_hash text DEFAULT NULL,
  _country_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _plan text; _limit int; _used int;
  _since timestamptz := (now() - interval '24 hours');
  _ip text := COALESCE(inet_client_addr()::text, 'unknown');
  _final_hash text;
  _existing uuid;
  _cc text := NULLIF(upper(left(coalesce(_country_code,''),2)), '');
BEGIN
  IF _idempotency_key IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'used', 0, 'limit', 0,
      'plan', 'guest', 'remaining', 0, 'error', 'missing_idempotency_key');
  END IF;

  _plan := public.get_effective_plan(_uid);
  SELECT daily_limit INTO _limit FROM public.plan_limits WHERE plan = _plan;
  IF _limit IS NULL THEN _limit := 0; END IF;

  IF _uid IS NULL THEN
    IF _guest_hash IS NULL OR length(_guest_hash) < 8 THEN
      RETURN jsonb_build_object('allowed', false, 'used', 0, 'limit', _limit,
        'plan', _plan, 'remaining', 0, 'error', 'missing_guest_hash');
    END IF;
    _final_hash := encode(sha256((_guest_hash || '|' || _ip)::bytea), 'hex');
  END IF;

  IF _uid IS NOT NULL THEN
    SELECT id INTO _existing FROM public.tool_usage
      WHERE user_id = _uid AND idempotency_key = _idempotency_key LIMIT 1;
  ELSE
    SELECT id INTO _existing FROM public.guest_usage
      WHERE guest_hash = _final_hash AND idempotency_key = _idempotency_key LIMIT 1;
  END IF;

  IF _existing IS NOT NULL THEN
    IF _uid IS NOT NULL THEN
      SELECT count(*) INTO _used FROM public.tool_usage WHERE user_id = _uid AND created_at >= _since;
    ELSE
      SELECT count(*) INTO _used FROM public.guest_usage WHERE guest_hash = _final_hash AND created_at >= _since;
    END IF;
    RETURN jsonb_build_object('allowed', true, 'used', _used, 'limit', _limit,
      'plan', _plan, 'remaining', CASE WHEN _limit < 0 THEN -1 ELSE GREATEST(_limit - _used, 0) END,
      'idempotent', true);
  END IF;

  IF _uid IS NOT NULL THEN
    SELECT count(*) INTO _used FROM public.tool_usage WHERE user_id = _uid AND created_at >= _since;
  ELSE
    SELECT count(*) INTO _used FROM public.guest_usage WHERE guest_hash = _final_hash AND created_at >= _since;
  END IF;

  IF _limit >= 0 AND _used >= _limit THEN
    RETURN jsonb_build_object('allowed', false, 'used', _used, 'limit', _limit,
      'plan', _plan, 'remaining', 0);
  END IF;

  BEGIN
    IF _uid IS NOT NULL THEN
      INSERT INTO public.tool_usage (user_id, tool_slug, idempotency_key, country_code)
        VALUES (_uid, _tool_slug, _idempotency_key, _cc);
    ELSE
      INSERT INTO public.guest_usage (guest_hash, tool_slug, idempotency_key, country_code)
        VALUES (_final_hash, _tool_slug, _idempotency_key, _cc);
    END IF;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('allowed', true, 'used', _used, 'limit', _limit,
      'plan', _plan, 'remaining', CASE WHEN _limit < 0 THEN -1 ELSE GREATEST(_limit - _used, 0) END,
      'idempotent', true);
  END;

  RETURN jsonb_build_object('allowed', true, 'used', _used + 1, 'limit', _limit,
    'plan', _plan, 'remaining', CASE WHEN _limit < 0 THEN -1 ELSE _limit - (_used + 1) END);
END;
$$;

REVOKE ALL ON FUNCTION public.check_and_record_usage(text, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_and_record_usage(text, uuid, text, text) TO anon, authenticated;

-- 3) Extend admin_stats with 7d + plan breakdown
CREATE OR REPLACE FUNCTION public.admin_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _r jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_build_object(
    'total_users', (SELECT count(*) FROM public.profiles),
    'signed_in_active_24h', (SELECT count(DISTINCT user_id) FROM public.tool_usage WHERE created_at >= now()-interval '24 hours'),
    'signed_in_active_7d',  (SELECT count(DISTINCT user_id) FROM public.tool_usage WHERE created_at >= now()-interval '7 days'),
    'guest_active_24h',     (SELECT count(DISTINCT guest_hash) FROM public.guest_usage WHERE created_at >= now()-interval '24 hours'),
    'guest_active_7d',      (SELECT count(DISTINCT guest_hash) FROM public.guest_usage WHERE created_at >= now()-interval '7 days'),
    'premium_users', (SELECT count(*) FROM public.subscriptions WHERE plan='premium' AND status='active'),
    'admins', (SELECT count(*) FROM public.user_roles WHERE role='admin'),
    'usage_24h', (SELECT count(*) FROM public.tool_usage WHERE created_at >= now()-interval '24 hours'),
    'usage_7d', (SELECT count(*) FROM public.tool_usage WHERE created_at >= now()-interval '7 days'),
    'guest_usage_24h', (SELECT count(*) FROM public.guest_usage WHERE created_at >= now()-interval '24 hours'),
    'guest_usage_7d',  (SELECT count(*) FROM public.guest_usage WHERE created_at >= now()-interval '7 days'),
    'plan_breakdown', (SELECT COALESCE(jsonb_object_agg(plan, cnt), '{}'::jsonb) FROM (
      SELECT plan::text as plan, count(*) as cnt FROM public.subscriptions WHERE status='active' GROUP BY plan
    ) p),
    'top_tools_24h', (SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) FROM (
      SELECT tool_slug, count(*) as uses FROM public.tool_usage
       WHERE created_at >= now()-interval '24 hours'
       GROUP BY tool_slug ORDER BY uses DESC LIMIT 10
    ) x)
  ) INTO _r;
  INSERT INTO public.audit_logs (actor_id, action, metadata)
    VALUES (auth.uid(), 'admin_stats_read', '{}'::jsonb);
  RETURN _r;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_stats() TO authenticated;

-- 4) admin_active_users
CREATE OR REPLACE FUNCTION public.admin_active_users(_minutes int DEFAULT 5)
RETURNS TABLE(
  kind text, actor_key text, email text, display_name text, plan text,
  last_tool_slug text, last_seen timestamptz, uses_in_window bigint, country_code text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _since timestamptz := now() - make_interval(mins => GREATEST(_minutes,1));
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.audit_logs (actor_id, action, metadata)
    VALUES (auth.uid(), 'admin_active_users_read', jsonb_build_object('minutes', _minutes));

  RETURN QUERY
  WITH u AS (
    SELECT DISTINCT ON (tu.user_id)
      tu.user_id, tu.tool_slug, tu.created_at, tu.country_code
    FROM public.tool_usage tu
    WHERE tu.created_at >= _since
    ORDER BY tu.user_id, tu.created_at DESC
  ), u_counts AS (
    SELECT user_id, count(*)::bigint AS uses FROM public.tool_usage
    WHERE created_at >= _since GROUP BY user_id
  ), g AS (
    SELECT DISTINCT ON (gu.guest_hash)
      gu.guest_hash, gu.tool_slug, gu.created_at, gu.country_code
    FROM public.guest_usage gu
    WHERE gu.created_at >= _since
    ORDER BY gu.guest_hash, gu.created_at DESC
  ), g_counts AS (
    SELECT guest_hash, count(*)::bigint AS uses FROM public.guest_usage
    WHERE created_at >= _since GROUP BY guest_hash
  )
  SELECT 'user'::text, u.user_id::text, p.email, p.display_name,
    public.get_effective_plan(u.user_id),
    u.tool_slug, u.created_at, uc.uses, u.country_code
  FROM u
  LEFT JOIN public.profiles p ON p.id = u.user_id
  LEFT JOIN u_counts uc ON uc.user_id = u.user_id
  UNION ALL
  SELECT 'guest'::text, g.guest_hash, NULL, NULL, 'guest'::text,
    g.tool_slug, g.created_at, gc.uses, g.country_code
  FROM g LEFT JOIN g_counts gc ON gc.guest_hash = g.guest_hash
  ORDER BY 7 DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_active_users(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_active_users(int) TO authenticated;

-- 5) admin_daily_totals
CREATE OR REPLACE FUNCTION public.admin_daily_totals(_days int DEFAULT 30)
RETURNS TABLE(day date, signed_in_uses bigint, guest_uses bigint, unique_users bigint, unique_guests bigint, top_tool text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _since timestamptz := (now() - make_interval(days => GREATEST(_days,1)))::date;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.audit_logs (actor_id, action, metadata)
    VALUES (auth.uid(), 'admin_daily_totals_read', jsonb_build_object('days', _days));

  RETURN QUERY
  WITH days AS (
    SELECT generate_series(_since::date, now()::date, interval '1 day')::date AS day
  ), s AS (
    SELECT created_at::date AS day, count(*)::bigint AS n, count(DISTINCT user_id)::bigint AS uu
    FROM public.tool_usage WHERE created_at >= _since GROUP BY 1
  ), g AS (
    SELECT created_at::date AS day, count(*)::bigint AS n, count(DISTINCT guest_hash)::bigint AS ug
    FROM public.guest_usage WHERE created_at >= _since GROUP BY 1
  ), combined AS (
    SELECT created_at::date AS day, tool_slug FROM public.tool_usage WHERE created_at >= _since
    UNION ALL
    SELECT created_at::date, tool_slug FROM public.guest_usage WHERE created_at >= _since
  ), tt AS (
    SELECT day, tool_slug, count(*) AS c,
      row_number() OVER (PARTITION BY day ORDER BY count(*) DESC) AS rn
    FROM combined GROUP BY day, tool_slug
  )
  SELECT d.day,
    COALESCE(s.n,0), COALESCE(g.n,0),
    COALESCE(s.uu,0), COALESCE(g.ug,0),
    (SELECT tool_slug FROM tt WHERE tt.day = d.day AND tt.rn = 1)
  FROM days d LEFT JOIN s ON s.day = d.day LEFT JOIN g ON g.day = d.day
  ORDER BY d.day;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_daily_totals(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_daily_totals(int) TO authenticated;

-- 6) admin_tool_leaderboard
CREATE OR REPLACE FUNCTION public.admin_tool_leaderboard(_days int DEFAULT 7)
RETURNS TABLE(tool_slug text, total bigint, signed_in bigint, guest bigint, unique_actors bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _since timestamptz := now() - make_interval(days => GREATEST(_days,1));
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.audit_logs (actor_id, action, metadata)
    VALUES (auth.uid(), 'admin_tool_leaderboard_read', jsonb_build_object('days', _days));

  RETURN QUERY
  WITH s AS (
    SELECT tool_slug, count(*)::bigint AS n, count(DISTINCT user_id)::bigint AS u
    FROM public.tool_usage WHERE created_at >= _since GROUP BY tool_slug
  ), g AS (
    SELECT tool_slug, count(*)::bigint AS n, count(DISTINCT guest_hash)::bigint AS u
    FROM public.guest_usage WHERE created_at >= _since GROUP BY tool_slug
  )
  SELECT COALESCE(s.tool_slug, g.tool_slug),
    COALESCE(s.n,0)+COALESCE(g.n,0),
    COALESCE(s.n,0), COALESCE(g.n,0),
    COALESCE(s.u,0)+COALESCE(g.u,0)
  FROM s FULL OUTER JOIN g ON s.tool_slug = g.tool_slug
  ORDER BY 2 DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_tool_leaderboard(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_tool_leaderboard(int) TO authenticated;

-- 7) admin_user_history
CREATE OR REPLACE FUNCTION public.admin_user_history(_target uuid, _limit int DEFAULT 100, _offset int DEFAULT 0)
RETURNS TABLE(id uuid, tool_slug text, created_at timestamptz, country_code text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.audit_logs (actor_id, action, metadata)
    VALUES (auth.uid(), 'admin_user_history_read', jsonb_build_object('target', _target, 'limit', _limit, 'offset', _offset));
  RETURN QUERY
  SELECT tu.id, tu.tool_slug, tu.created_at, tu.country_code
  FROM public.tool_usage tu WHERE tu.user_id = _target
  ORDER BY tu.created_at DESC
  LIMIT LEAST(GREATEST(_limit,1), 500) OFFSET GREATEST(_offset,0);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_user_history(uuid, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_user_history(uuid, int, int) TO authenticated;

-- 8) admin_usage_search
CREATE OR REPLACE FUNCTION public.admin_usage_search(
  _actor uuid DEFAULT NULL,
  _tool text DEFAULT NULL,
  _from timestamptz DEFAULT NULL,
  _to timestamptz DEFAULT NULL,
  _kind text DEFAULT 'all',
  _limit int DEFAULT 100,
  _offset int DEFAULT 0
)
RETURNS TABLE(kind text, actor_key text, email text, tool_slug text, created_at timestamptz, country_code text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _lim int := LEAST(GREATEST(_limit,1), 500); _off int := GREATEST(_offset,0);
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.audit_logs (actor_id, action, metadata)
    VALUES (auth.uid(), 'admin_usage_search',
      jsonb_build_object('actor',_actor,'tool',_tool,'from',_from,'to',_to,'kind',_kind,'limit',_lim,'offset',_off));

  RETURN QUERY
  WITH s AS (
    SELECT 'user'::text AS kind, tu.user_id::text AS actor_key, p.email, tu.tool_slug, tu.created_at, tu.country_code
    FROM public.tool_usage tu LEFT JOIN public.profiles p ON p.id = tu.user_id
    WHERE (_kind IN ('all','user'))
      AND (_actor IS NULL OR tu.user_id = _actor)
      AND (_tool IS NULL OR tu.tool_slug = _tool)
      AND (_from IS NULL OR tu.created_at >= _from)
      AND (_to IS NULL OR tu.created_at <= _to)
  ), g AS (
    SELECT 'guest'::text, gu.guest_hash, NULL::text, gu.tool_slug, gu.created_at, gu.country_code
    FROM public.guest_usage gu
    WHERE (_kind IN ('all','guest'))
      AND (_actor IS NULL)
      AND (_tool IS NULL OR gu.tool_slug = _tool)
      AND (_from IS NULL OR gu.created_at >= _from)
      AND (_to IS NULL OR gu.created_at <= _to)
  )
  SELECT * FROM (SELECT * FROM s UNION ALL SELECT * FROM g) x
  ORDER BY x.created_at DESC
  LIMIT _lim OFFSET _off;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_usage_search(uuid, text, timestamptz, timestamptz, text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_usage_search(uuid, text, timestamptz, timestamptz, text, int, int) TO authenticated;

-- 9) admin_audit_search
CREATE OR REPLACE FUNCTION public.admin_audit_search(
  _actor uuid DEFAULT NULL,
  _action text DEFAULT NULL,
  _from timestamptz DEFAULT NULL,
  _to timestamptz DEFAULT NULL,
  _limit int DEFAULT 100,
  _offset int DEFAULT 0
)
RETURNS TABLE(id uuid, actor_id uuid, email text, action text, metadata jsonb, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _lim int := LEAST(GREATEST(_limit,1), 500); _off int := GREATEST(_offset,0);
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.audit_logs (actor_id, action, metadata)
    VALUES (auth.uid(), 'admin_audit_search',
      jsonb_build_object('actor',_actor,'action',_action,'from',_from,'to',_to,'limit',_lim,'offset',_off));

  RETURN QUERY
  SELECT a.id, a.actor_id, p.email, a.action, a.metadata, a.created_at
  FROM public.audit_logs a LEFT JOIN public.profiles p ON p.id = a.actor_id
  WHERE (_actor IS NULL OR a.actor_id = _actor)
    AND (_action IS NULL OR a.action = _action)
    AND (_from IS NULL OR a.created_at >= _from)
    AND (_to IS NULL OR a.created_at <= _to)
  ORDER BY a.created_at DESC
  LIMIT _lim OFFSET _off;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_audit_search(uuid, text, timestamptz, timestamptz, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_audit_search(uuid, text, timestamptz, timestamptz, int, int) TO authenticated;

-- 10) Realtime publication for live tab
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='tool_usage') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tool_usage;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='guest_usage') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.guest_usage;
  END IF;
END $$;
