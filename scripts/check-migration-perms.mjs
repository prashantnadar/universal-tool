#!/usr/bin/env node
/**
 * CI guard: block migrations that silently re-open SECURITY DEFINER surface.
 *
 * Rules enforced against every file in supabase/migrations/*.sql:
 *
 *   1. Any CREATE OR REPLACE FUNCTION ... SECURITY DEFINER must be accompanied
 *      somewhere in the same migration by an explicit REVOKE ... FROM PUBLIC
 *      on that function (or a REVOKE from PUBLIC/anon/authenticated with the
 *      same function name). This prevents accidental default PUBLIC EXECUTE.
 *
 *   2. No GRANT EXECUTE ... TO PUBLIC on any function.
 *
 *   3. No GRANT ... TO anon on ANY function whose name starts with `admin_`
 *      (admin RPCs must never be reachable by unauthenticated callers).
 *
 * Exit 1 (fails CI) on any violation. Run locally: `node scripts/check-migration-perms.mjs`.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = "supabase/migrations";
// Baseline: only enforce on migrations added on/after the hardening date.
// Older migrations were audited manually and re-locked by the 20260708 pair.
const BASELINE = "20260708071331";
let failed = 0;

const files = readdirSync(DIR)
  .filter((f) => f.endsWith(".sql") && f.slice(0, 14) >= BASELINE)
  .sort();

for (const f of files) {
  const sql = readFileSync(join(DIR, f), "utf8");
  const lower = sql.toLowerCase();

  // Rule 2: never grant EXECUTE to PUBLIC.
  const publicGrant = lower.match(/grant\s+execute[^;]+to\s+public/);
  if (publicGrant) {
    console.error(`✖ ${f}: GRANT EXECUTE ... TO PUBLIC is forbidden`);
    failed++;
  }

  // Rule 1: every SECURITY DEFINER function must revoke PUBLIC in the same file.
  const fnRegex =
    /create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?([a-z_][a-z0-9_]*)\s*\([^)]*\)[\s\S]*?security\s+definer/gi;
  let m;
  while ((m = fnRegex.exec(sql)) !== null) {
    const name = m[1];
    const revokePattern = new RegExp(
      `revoke[^;]+on\\s+function[^;]*\\b${name}\\b[^;]*from[^;]*(public|anon|authenticated)`,
      "i",
    );
    if (!revokePattern.test(sql)) {
      console.error(
        `✖ ${f}: SECURITY DEFINER function \`${name}\` has no REVOKE from PUBLIC/anon/authenticated in the same migration`,
      );
      failed++;
    }
  }

  // Rule 3: admin_* functions must never be granted to anon.
  const anonAdminGrant = sql.match(
    /grant\s+execute[^;]+on\s+function[^;]*\badmin_[a-z_]+\b[^;]*to[^;]*\banon\b/i,
  );
  if (anonAdminGrant) {
    console.error(`✖ ${f}: admin_* function granted to anon is forbidden`);
    failed++;
  }
}

if (failed > 0) {
  console.error(`\n${failed} migration permission violation(s). Fix before merging.`);
  process.exit(1);
}
console.log(`✓ ${files.length} migration(s) passed permission checks.`);
