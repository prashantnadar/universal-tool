import { useCallback, useState } from "react";
import { executeWithUsage, type UsageResult } from "@/lib/usage-limits";
import { logUsage } from "@/lib/usage-log";
import { UsageLimitBanner } from "@/components/UsageLimitBanner";

/**
 * Centralized tool-usage pipeline.
 *
 * Every tool category MUST route its actions through `run(toolSlug, fn)`.
 * This guarantees:
 *   - server-authoritative quota reservation
 *   - idempotency (double-click / refresh safe)
 *   - refund on execution failure
 *   - unified [usage:success|blocked|refunded|error] logging
 *   - consistent limit banner + aria-live message
 *
 * Do not implement tool-specific usage logic. Use this hook everywhere.
 */
export function useToolUsage() {
  const [usage, setUsage] = useState<UsageResult | null>(null);
  const [limitMsg, setLimitMsg] = useState<string | null>(null);

  const run = useCallback(
    async <T,>(toolSlug: string, fn: () => T | Promise<T>): Promise<T | undefined> => {
      setLimitMsg(null);
      const res = await executeWithUsage(toolSlug, async () => fn());
      setUsage(res.usage);
      if (res.ok) {
        logUsage("success", {
          tool: toolSlug, key: res.idempotencyKey, plan: res.usage.plan,
          used: res.usage.used, limit: res.usage.limit, remaining: res.usage.remaining,
        });
        return res.result;
      }
      if (res.reason === "limit") {
        logUsage("blocked", {
          tool: toolSlug, key: res.idempotencyKey, plan: res.usage.plan,
          used: res.usage.used, limit: res.usage.limit, remaining: res.usage.remaining,
        });
        setLimitMsg(`Daily limit reached (${res.usage.used}/${res.usage.limit}). Sign in or upgrade to continue.`);
      } else if (res.reason === "execution") {
        logUsage("refunded", { tool: toolSlug, key: res.idempotencyKey, message: res.error?.message });
        setLimitMsg("Something went wrong. Your quota was refunded — please retry.");
      } else {
        logUsage("error", { tool: toolSlug, key: res.idempotencyKey, message: res.error?.message });
        setLimitMsg("Network error. No usage was counted. Please retry.");
      }
      return undefined;
    },
    [],
  );

  const banner = (
    <>
      <UsageLimitBanner result={usage} />
      {limitMsg && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
        >
          {limitMsg}
        </div>
      )}
    </>
  );

  return { run, usage, limitMsg, banner };
}
