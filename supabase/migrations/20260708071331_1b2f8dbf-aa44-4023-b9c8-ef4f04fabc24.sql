
-- Revoke default PUBLIC EXECUTE on all SECURITY DEFINER functions and re-grant narrowly.

-- Trigger / internal-only functions: no client execution needed.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_admin_self_grant() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prune_guest_usage() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_effective_plan(uuid) FROM PUBLIC, anon, authenticated;

-- has_role is used inside RLS policies, which run as the caller; grant to authenticated only.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Usage RPCs: callable by guests (anon) and signed-in users.
REVOKE ALL ON FUNCTION public.check_and_record_usage(text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_and_record_usage(text, uuid, text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.get_usage_status(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_usage_status(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.refund_usage(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refund_usage(uuid, text) TO anon, authenticated;

-- Admin RPCs: only signed-in users (function body enforces admin role).
REVOKE ALL ON FUNCTION public.admin_set_plan(uuid, public.plan_type) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_plan(uuid, public.plan_type) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_set_role(uuid, public.app_role, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_role(uuid, public.app_role, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_stats() TO authenticated;

REVOKE ALL ON FUNCTION public.admin_list_users(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users(integer, integer) TO authenticated;
