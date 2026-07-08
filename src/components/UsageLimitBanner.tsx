import { Link } from "@tanstack/react-router";
import { AlertCircle, Gauge } from "lucide-react";
import type { UsageResult } from "@/lib/usage-limits";

export function UsageLimitBanner({ result }: { result: UsageResult | null }) {
  if (!result) return null;
  // Unlimited plans — nothing to show.
  if (result.limit < 0) return null;

  const isGuest = result.plan === "guest";
  const remaining = Math.max(result.limit - result.used, 0);

  // Not blocked yet — show a small "remaining today" chip.
  if (result.allowed) {
    const low = remaining <= 1;
    return (
      <div
        className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-sm ${
          low
            ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
            : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300"
        }`}
      >
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4" aria-hidden />
          <span>
            <strong className="font-semibold">{remaining}</strong> of {result.limit} daily uses left
            {isGuest ? " (guest)" : ""}
          </span>
        </div>
        {isGuest && (
          <div className="flex gap-2">
            <Link to="/auth" className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700">
              Sign up — get 10/day
            </Link>
            <Link to="/pricing" className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold hover:bg-white dark:border-slate-700 dark:hover:bg-slate-800">
              Go Premium
            </Link>
          </div>
        )}
      </div>
    );
  }

  // Blocked — amber alert.
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="mb-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950/40"
    >
      <AlertCircle className="mt-0.5 h-5 w-5 flex-none text-amber-600" aria-hidden />
      <div className="flex-1">
        <p className="font-semibold text-amber-900 dark:text-amber-200">
          Daily limit reached ({result.used}/{result.limit})
        </p>
        <p className="mt-1 text-amber-800 dark:text-amber-300">
          {isGuest
            ? "Sign up for a free account to get 10 tools per day, or upgrade to Premium for unlimited access."
            : "Upgrade to Premium for unlimited daily tool usage."}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {isGuest && (
            <Link to="/auth" className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700">
              Sign up free
            </Link>
          )}
          <Link to="/pricing" className="rounded-md border border-amber-400 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/40">
            {isGuest ? "View pricing" : "Upgrade to Premium"}
          </Link>
        </div>
      </div>
    </div>
  );
}
