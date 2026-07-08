# UniversalTools

[![DB perms](../../actions/workflows/db-perms.yml/badge.svg)](../../actions/workflows/db-perms.yml)

Free online tools for PDF, image, text, and more — no login required for most tools.

## CI

- **DB permissions guard** — every migration is scanned for `SECURITY DEFINER` lockdown, `GRANT EXECUTE ... TO PUBLIC`, and `admin_*` functions leaking to `anon`. See `scripts/check-migration-perms.mjs`.
