
-- 1) Remove hardcoded admin-email bootstrap trigger + function.
DROP TRIGGER IF EXISTS grant_admin_for_bootstrap_trigger ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_bootstrap_admin ON auth.users;
DROP FUNCTION IF EXISTS public.grant_admin_for_bootstrap() CASCADE;

-- 2) Tighten settings SELECT policy: authenticated users only.
DROP POLICY IF EXISTS "Anyone read settings" ON public.settings;
CREATE POLICY "Authenticated read settings"
  ON public.settings FOR SELECT
  TO authenticated
  USING (true);

-- 3) Explicit restrictive protection for user_roles: only admins may write.
--    Missing policies already fail-closed, but add a RESTRICTIVE guard so a
--    future permissive policy cannot accidentally enable privilege escalation.
DROP POLICY IF EXISTS "Restrict role writes to admins" ON public.user_roles;
CREATE POLICY "Restrict role writes to admins"
  ON public.user_roles
  AS RESTRICTIVE
  FOR ALL
  TO authenticated, anon
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4) Revoke public EXECUTE on SECURITY DEFINER helpers that must not be
--    callable from the Data API. Keep explicit grants only for functions
--    the client legitimately calls via supabase.rpc().
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_effective_plan(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prune_guest_usage() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_touch_updated_at() FROM PUBLIC, anon, authenticated;

-- Admin RPCs: only signed-in users may invoke; the function body checks has_role.
REVOKE EXECUTE ON FUNCTION public.admin_list_users(integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_plan(uuid, plan_type) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_role(uuid, app_role, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_plan(uuid, plan_type) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_role(uuid, app_role, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_stats() TO authenticated;

-- Usage RPCs are legitimately called by guests + signed-in users.
REVOKE EXECUTE ON FUNCTION public.check_and_record_usage(text, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.refund_usage(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_usage_status(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_and_record_usage(text, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_usage(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_usage_status(text) TO anon, authenticated;
