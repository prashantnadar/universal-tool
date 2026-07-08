-- Add audit logging for admin RPC reads and ensure indices for auditing.

CREATE INDEX IF NOT EXISTS tool_usage_user_created_idx ON public.tool_usage (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS tool_usage_tool_created_idx ON public.tool_usage (tool_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS guest_usage_tool_created_idx ON public.guest_usage (tool_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON public.audit_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON public.audit_logs (action, created_at DESC);

-- admin_stats: log read access so we know which admins pulled dashboards.
CREATE OR REPLACE FUNCTION public.admin_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  -- Perform this INSERT as SECURITY DEFINER owner so admin RLS applies via has_role check we already ran.
  INSERT INTO public.audit_logs (actor_id, action, metadata)
    VALUES (auth.uid(), 'admin_stats_read', '{}'::jsonb);
  RETURN _r;
END;
$function$;

-- admin_list_users: log read access with pagination params.
CREATE OR REPLACE FUNCTION public.admin_list_users(_limit integer DEFAULT 100, _offset integer DEFAULT 0)
 RETURNS TABLE(user_id uuid, email text, display_name text, plan text, is_admin boolean, created_at timestamp with time zone, usage_24h bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.audit_logs (actor_id, action, metadata)
    VALUES (auth.uid(), 'admin_list_users_read',
      jsonb_build_object('limit', _limit, 'offset', _offset));
  RETURN QUERY
  SELECT p.id, p.email, p.display_name,
    COALESCE((SELECT s.plan::text FROM public.subscriptions s WHERE s.user_id = p.id AND s.status='active' ORDER BY s.created_at DESC LIMIT 1),'free'),
    public.has_role(p.id,'admin'), p.created_at,
    (SELECT count(*) FROM public.tool_usage tu WHERE tu.user_id = p.id AND tu.created_at >= now()-interval '24 hours')
  FROM public.profiles p ORDER BY p.created_at DESC LIMIT _limit OFFSET _offset;
END;
$function$;

-- Note: admin_set_plan and admin_set_role already write to audit_logs.
-- Note: tool_usage / guest_usage already record every usage RPC call with tool_slug + timestamp,
--       so per-tool audit ("who ran which tool when") is fully covered.

-- Idempotent reassertion of the minimal-privilege model. Any future migration
-- that inadvertently re-GRANTs PUBLIC EXECUTE will be caught by CI (see .github/workflows/db-perms.yml).
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_admin_self_grant() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prune_guest_usage() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_effective_plan(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_set_plan(uuid, plan_type) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_role(uuid, app_role, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_stats() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_users(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_plan(uuid, plan_type) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_role(uuid, app_role, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users(integer, integer) TO authenticated;