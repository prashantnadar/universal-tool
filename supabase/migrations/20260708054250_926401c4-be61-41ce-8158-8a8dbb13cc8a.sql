
-- Safeguard: block any admin role assignment except by an existing admin.
-- This is a defense-in-depth layer on top of RLS: even if a future migration
-- accidentally adds a permissive policy or a bootstrap trigger, this DB trigger
-- rejects the insert unless the caller is already an admin or the service_role.

CREATE OR REPLACE FUNCTION public.prevent_admin_self_grant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _role text := current_setting('request.jwt.claim.role', true);
BEGIN
  IF NEW.role <> 'admin' THEN
    RETURN NEW;
  END IF;

  -- Allow service_role (server-side maintenance) and existing admins only.
  IF _role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF _caller IS NOT NULL AND public.has_role(_caller, 'admin') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'admin_grant_forbidden: only existing admins may grant the admin role';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prevent_admin_self_grant() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_prevent_admin_self_grant ON public.user_roles;
CREATE TRIGGER trg_prevent_admin_self_grant
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.prevent_admin_self_grant();

-- Reassert: handle_new_user must NEVER grant admin. Rewrite it explicitly.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  ) ON CONFLICT (id) DO NOTHING;

  -- Hard-coded 'user' role only. Never 'admin', never email-based, never metadata-based.
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;

  INSERT INTO public.subscriptions (user_id, plan, status) VALUES (NEW.id, 'free', 'active') ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Belt-and-braces: drop any lingering bootstrap trigger/function that could email-promote.
DROP TRIGGER IF EXISTS grant_admin_for_bootstrap_trigger ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_bootstrap_admin ON auth.users;
DROP FUNCTION IF EXISTS public.grant_admin_for_bootstrap() CASCADE;
