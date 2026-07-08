/**
 * Central console logger for usage lifecycle events.
 * Consistent, filterable prefixes let us trace an entire request end-to-end:
 *   [usage:attempt] → [usage:retry] (0..n) → [usage:success | blocked | refunded | error]
 * Every event carries the idempotency key so retries and refunds correlate.
 */
export type UsageEvent =
  | "attempt"
  | "retry"
  | "success"
  | "blocked"
  | "refunded"
  | "error"
  | "admin_gate";

type Payload = {
  tool?: string;
  key?: string;
  plan?: string;
  used?: number;
  limit?: number;
  remaining?: number;
  reason?: string;
  message?: string;
  attempt?: number;
  delayMs?: number;
  status?: "ok" | "denied" | "error";
  [k: string]: unknown;
};

export function logUsage(event: UsageEvent, payload: Payload = {}) {
  const tag = `[usage:${event}]`;
  const label = payload.tool ?? payload.status ?? "";
  const line = `${tag} ${label}`.trim();
  // eslint-disable-next-line no-console
  const fn =
    event === "error" || event === "blocked"
      ? console.warn
      : event === "retry"
      ? console.debug
      : console.info;
  fn(line, payload);
}
