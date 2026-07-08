/**
 * Runtime safeguard: the app must never carry a hardcoded "bootstrap admin"
 * email that auto-promotes a signup to admin. If any client code accidentally
 * introduces such a pattern (e.g. `if (email === "owner@x.com") grantAdmin(...)`),
 * this assertion catches it at boot in development and logs a loud warning in
 * production instead of silently shipping the vulnerability.
 *
 * Server-side, the same invariant is enforced by:
 *  - `handle_new_user()` hard-coding role='user' only
 *  - the `prevent_admin_self_grant` trigger on `public.user_roles`
 *  - the RESTRICTIVE RLS policy requiring `has_role(auth.uid(), 'admin')`
 *
 * Admin promotion is only possible via `admin_set_role` RPC called by an
 * already-authenticated admin. No email-based path exists in any layer.
 */

const FORBIDDEN_PATTERNS = [
  /bootstrap[_-]?admin[_-]?email/i,
  /admin[_-]?bootstrap[_-]?email/i,
  /grant[_-]?admin[_-]?for[_-]?bootstrap/i,
];

export function assertNoAdminBootstrap(source?: string) {
  if (!source) return;
  for (const p of FORBIDDEN_PATTERNS) {
    if (p.test(source)) {
      const msg = `[security] admin bootstrap pattern detected: ${p}`;
      if (import.meta.env.DEV) throw new Error(msg);
      // eslint-disable-next-line no-console
      console.error(msg);
    }
  }
}

/**
 * Boot-time check: scan a curated allow-list of module-scope constants for
 * any leaked "bootstrap admin" email. Kept intentionally narrow — this is a
 * safety net, not a linter substitute.
 */
export function runAdminBootstrapAudit(constants: Record<string, unknown>) {
  for (const [name, value] of Object.entries(constants)) {
    if (typeof value !== "string") continue;
    assertNoAdminBootstrap(`${name}=${value}`);
    // Detect naked email strings paired with an "admin"-flavoured name.
    if (/admin/i.test(name) && /@/.test(value)) {
      const msg = `[security] suspicious admin-email constant "${name}" — admin role must come from user_roles table, never a hardcoded email.`;
      if (import.meta.env.DEV) throw new Error(msg);
      // eslint-disable-next-line no-console
      console.error(msg);
    }
  }
}
