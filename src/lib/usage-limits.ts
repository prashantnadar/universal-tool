import { supabase } from "@/integrations/supabase/client";
import { pushRecent } from "./recently-used";
import { logUsage } from "./usage-log";

const GUEST_KEY = "ut-guest-fp";

export type UsageResult = {
  allowed: boolean;
  used: number;
  limit: number; // -1 = unlimited
  plan: "guest" | "free" | "premium" | "admin";
  remaining: number;
  error?: string;
  idempotent?: boolean;
};

/** Persistent client fingerprint (server combines with caller IP before hashing). */
async function getGuestHash(): Promise<string> {
  if (typeof window === "undefined") return "ssr-guest";
  let id = localStorage.getItem(GUEST_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(GUEST_KEY, id);
  }
  const raw = [
    id,
    navigator.userAgent,
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    `${screen.width}x${screen.height}`,
  ].join("|");
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Generate a fresh idempotency key. One key = one logical execution. */
export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

/**
 * Retry a promise-returning fn with exponential backoff on transient failures.
 * Server dedupes by idempotency_key, so retries never double-charge.
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  isTransient: (r: T) => boolean,
  opts: { attempts?: number; baseMs?: number; label?: string; key?: string } = {},
): Promise<T> {
  const attempts = opts.attempts ?? 4;
  const baseMs = opts.baseMs ?? 200;
  let last: T | undefined;
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await fn(i);
      if (!isTransient(r)) return r;
      last = r;
    } catch (e) {
      if (i === attempts - 1) throw e;
    }
    const delay = baseMs * Math.pow(2, i) + Math.random() * baseMs;
    if (opts.label) {
      logUsage("retry", { tool: opts.label, key: opts.key, attempt: i + 1, delayMs: Math.round(delay) });
    }
    await new Promise((res) => setTimeout(res, delay));
  }
  return last as T;
}

const isTransientRpcError = (msg?: string) => {
  if (!msg) return false;
  const m = msg.toLowerCase();
  return (
    m.includes("fetch") || m.includes("network") || m.includes("timeout") ||
    m.includes("temporarily") || m.includes("503") || m.includes("502") ||
    m.includes("504") || m.includes("econn")
  );
};

/**
 * Atomically check the daily limit and record a use (idempotent by key).
 * Retries transient network/5xx errors with exponential backoff.
 */
export async function checkAndRecord(toolSlug: string, idempotencyKey: string): Promise<UsageResult> {
  const hash = await getGuestHash();
  const { getCountryCode } = await import("./guestCountry");
  const cc = await getCountryCode().catch(() => null);
  logUsage("attempt", { tool: toolSlug, key: idempotencyKey });
  const result = await withRetry<UsageResult>(
    async () => {
      const { data, error } = await supabase.rpc("check_and_record_usage", {
        _tool_slug: toolSlug,
        _idempotency_key: idempotencyKey,
        _guest_hash: hash,
        _country_code: cc,
      } as never);
      if (error) {
        return { allowed: false, used: 0, limit: 0, plan: "guest", remaining: 0, error: error.message };
      }
      return data as unknown as UsageResult;
    },
    (r) => Boolean(r.error) && isTransientRpcError(r.error),
    { label: toolSlug, key: idempotencyKey },
  );
  if (result.allowed) pushRecent(toolSlug);
  return result;
}

/** Refund a previous reservation. Retries transient failures — safe server-side. */
export async function refundUsage(idempotencyKey: string): Promise<boolean> {
  const hash = await getGuestHash();
  try {
    return await withRetry<boolean>(
      async () => {
        const { data, error } = await supabase.rpc("refund_usage", {
          _idempotency_key: idempotencyKey,
          _guest_hash: hash,
        });
        if (error) throw new Error(error.message);
        return Boolean((data as unknown as { refunded?: boolean } | null)?.refunded);
      },
      () => false,
      { label: "refund", key: idempotencyKey },
    );
  } catch {
    return false;
  }
}

/** Read-only usage status for UI (no record). Retries transient failures. */
export async function getUsageStatus(): Promise<UsageResult> {
  const hash = await getGuestHash();
  return withRetry<UsageResult>(
    async () => {
      const { data, error } = await supabase.rpc("get_usage_status", { _guest_hash: hash });
      if (error) {
        return { allowed: true, used: 0, limit: 0, plan: "guest", remaining: 0, error: error.message };
      }
      return data as unknown as UsageResult;
    },
    (r) => Boolean(r.error) && isTransientRpcError(r.error),
    { label: "usage_status" },
  );
}

/**
 * Run a tool with full production safety:
 *  1. Reserve quota via check_and_record_usage (server-authoritative)
 *  2. Execute the tool
 *  3. On failure OR rejection, refund the reservation
 *
 * The idempotency key is fixed for the whole run, so double-click, StrictMode
 * remount, or a retried network call resolve to the same reservation.
 */
export async function executeWithUsage<T>(
  toolSlug: string,
  run: () => Promise<T>,
  opts?: { idempotencyKey?: string },
): Promise<
  | { ok: true; result: T; usage: UsageResult; idempotencyKey: string }
  | { ok: false; reason: "limit" | "network" | "execution"; usage: UsageResult; error?: Error; idempotencyKey: string }
> {
  const idempotencyKey = opts?.idempotencyKey ?? newIdempotencyKey();
  const usage = await checkAndRecord(toolSlug, idempotencyKey);

  if (usage.error) {
    return { ok: false, reason: "network", usage, error: new Error(usage.error), idempotencyKey };
  }
  if (!usage.allowed) {
    return { ok: false, reason: "limit", usage, idempotencyKey };
  }

  try {
    const result = await run();
    return { ok: true, result, usage, idempotencyKey };
  } catch (e) {
    // Roll back the deduction — execution failed, quota should be untouched.
    await refundUsage(idempotencyKey);
    return { ok: false, reason: "execution", usage, error: e as Error, idempotencyKey };
  }
}

/** In-flight tracker to collapse rapid duplicate submissions on the same key. */
const inFlight = new Map<string, Promise<unknown>>();

/** Wrap executeWithUsage to guarantee single-flight per idempotency key. */
export function executeSingleFlight<T>(
  toolSlug: string,
  idempotencyKey: string,
  run: () => Promise<T>,
) {
  const existing = inFlight.get(idempotencyKey) as
    | Promise<Awaited<ReturnType<typeof executeWithUsage<T>>>>
    | undefined;
  if (existing) return existing;
  const p = executeWithUsage(toolSlug, run, { idempotencyKey }).finally(() => {
    inFlight.delete(idempotencyKey);
  });
  inFlight.set(idempotencyKey, p);
  return p;
}
