
# Admin Panel + Live Tracking + CSV + CI Badge

Everything is standard PostgreSQL, Supabase Data API, TanStack server routes, and Supabase Realtime — no Lovable-specific glue. It moves cleanly to any self-hosted Supabase / Postgres host.

## 1. Schema (one migration)

Add nullable columns for approx region (populated best-effort, no vendor lock):

- `tool_usage.country_code text` (nullable, 2-letter ISO)
- `guest_usage.country_code text` (nullable)

Grants unchanged, RLS unchanged. Indexes on `(created_at desc)` already exist from the last audit migration.

## 2. New admin RPCs (SECURITY DEFINER, `TO authenticated`, admin-role gate, write to `audit_logs`)

- `admin_active_users(_minutes int default 5)` — one row per actor active in the last N minutes:
  `kind ('user'|'guest'), actor_key, email, plan, last_tool_slug, last_seen, uses_in_window, country_code`
- `admin_daily_totals(_days int default 30)` — day, signed_in_uses, guest_uses, unique_users, unique_guests, top_tool
- `admin_tool_leaderboard(_days int default 7)` — tool_slug, total, signed_in, guest, unique_actors
- `admin_user_history(_target uuid, _limit, _offset)` — that user's timeline
- `admin_usage_search(_actor uuid|null, _tool text|null, _from timestamptz, _to timestamptz, _kind text default 'all', _limit int default 100, _offset int default 0)` — unified feed across `tool_usage` + `guest_usage`
- `admin_audit_search(_actor uuid|null, _action text|null, _from timestamptz, _to timestamptz, _limit, _offset)`
- Extend `admin_stats` with plan breakdown (free/premium/pro), guest_usage_7d, signed_in_users_7d

Each RPC inserts a row into `audit_logs` on invocation so admin reads themselves stay auditable.

## 3. Update `check_and_record_usage`

Add an optional `_country_code text default null` parameter; store on insert. Backward-compatible — existing clients that don't pass it still work.

## 4. CSV export (server routes, not server fns)

Server functions can't stream raw responses; server routes can. Two new routes:

- `GET /api/admin/export/tool-usage.csv?from=…&to=…&actor=…&tool=…&kind=all|user|guest`
- `GET /api/admin/export/audit-logs.csv?from=…&to=…&actor=…&action=…`

Each handler:
1. Reads bearer token from `Authorization` header, verifies via `supabase.auth.getUser`.
2. Calls `has_role(uid,'admin')` — 403 otherwise.
3. Streams CSV with a `ReadableStream`, paging through rows in 1000-row chunks. No cap.
4. Writes an `audit_logs` row with the filters and total row count on completion.

Placed at `src/routes/api/admin/export.tool-usage.csv.ts` and `.audit-logs.csv.ts`. Downloads triggered from the UI with a signed-in-user `fetch()` that attaches the bearer token, then `URL.createObjectURL`.

## 5. Admin UI (extends existing `/admin`)

Tabs on `src/routes/_authenticated/admin.tsx`:

- **Overview** — stat cards (total users, signed-in 24h/7d, guest 24h/7d, admins, per-plan counts) + 30-day stacked bar chart (Recharts) via `admin_daily_totals` + tool leaderboard table via `admin_tool_leaderboard`.
- **Live** — table of currently active actors (last 5 min): kind, email/guest hash, plan, current tool, uses in window, country, last seen. Fed by `admin_active_users` with:
  - Supabase Realtime subscription on `INSERT` for `public.tool_usage` and `public.guest_usage` → refetch active-users query.
  - 30 s polling fallback so it works even if Realtime is disabled on a future host.
  - Enable Realtime via `alter publication supabase_realtime add table …` in the same migration.
- **Users** — existing list, add plan/role filter and "View history" drawer that calls `admin_user_history`.
- **Usage logs** — filters (actor picker, tool slug, date range, kind), paged 100/page, "Export CSV" button.
- **Audit logs** — filters (actor, action, date range), paged, "Export CSV" button.

Client-side country resolution: on first load, guests hit `https://ipapi.co/country/` (free, cache in `localStorage` for 7 days) and pass the 2-letter code to `check_and_record_usage`. Best-effort; falls back to null. No PII beyond country.

## 6. Throttling

Skipped per your answer — daily quota + idempotency key are the only server-side limits. Recorded in project memory so future migrations don't re-add it silently.

## 7. CI badge + summary

- Add a status badge line to `README.md`:
  `[![DB perms](https://github.com/OWNER/REPO/actions/workflows/db-perms.yml/badge.svg)](https://github.com/OWNER/REPO/actions/workflows/db-perms.yml)`
- Extend `.github/workflows/db-perms.yml`:
  - Emit a summary section to `$GITHUB_STEP_SUMMARY` listing migrations checked, functions scanned, and PASS/FAIL per rule.
  - On failure, print the offending migration path + line hint.

## Files touched

- `supabase/migrations/<new>.sql` (schema + all new RPCs + `check_and_record_usage` overload + Realtime publication + audit-log inserts)
- `src/routes/_authenticated/admin.tsx` (tabs, replaces current admin page contents)
- `src/routes/_authenticated/admin/*.tsx` (child routes per tab, optional; else internal tabs component)
- `src/routes/api/admin/export.tool-usage.csv.ts` (new)
- `src/routes/api/admin/export.audit-logs.csv.ts` (new)
- `src/hooks/useAdminData.ts` (new — thin wrappers over the RPCs)
- `src/lib/guestCountry.ts` (new — cached country lookup)
- Wire `_country_code` into existing `checkAndRecordUsage` call sites (single helper, small diff)
- `.github/workflows/db-perms.yml` (summary step)
- `README.md` (badge)
- `mem://` update: note portability decision + skipped throttling

## Confirm

If this looks right, I'll ship it in one pass. Anything you want to trim or expand?
