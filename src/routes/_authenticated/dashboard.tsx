import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/lib/auth-context";
import { getUsageStatus, type UsageResult } from "@/lib/usage-limits";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — UniversalTools" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user, role, plan, isAdmin } = useAuth();
  const [usage, setUsage] = useState<UsageResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    getUsageStatus().then((r) => { if (!cancelled) setUsage(r); });
    return () => { cancelled = true; };
  }, []);

  const limitLabel = !usage
    ? "…"
    : usage.limit < 0
      ? "Unlimited"
      : `${usage.used} / ${usage.limit} today`;

  return (
    <Layout>
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Welcome{user?.user_metadata?.display_name ? `, ${user.user_metadata.display_name}` : ""}
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{user?.email}</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatCard label="Plan" value={plan.toUpperCase()} />
          <StatCard label="Role" value={(role ?? "user").toUpperCase()} />
          <StatCard label="Usage (24h)" value={limitLabel} />
        </div>

        {usage && usage.limit > 0 && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Daily quota</span>
              <span className="tabular-nums text-slate-500">{usage.used} / {usage.limit}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{ width: `${Math.min(100, (usage.used / usage.limit) * 100)}%` }}
                aria-hidden
              />
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Browse tools</Link>
          <Link to="/pricing" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium dark:border-slate-700 dark:text-white">Upgrade plan</Link>
          {isAdmin && <Link to="/admin" className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300">Admin panel</Link>}
        </div>
      </section>
    </Layout>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
    </div>
  );
}
