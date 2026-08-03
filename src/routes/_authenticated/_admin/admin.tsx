import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";


import {
  adminActiveUsers,
  adminAuditSearch,
  adminDailyTotals,
  adminArchiveContactMessage,
  adminListArchivedContactMessages,
  adminListContactMessages,
  adminMarkContactRead,
  adminListUsers,
  adminSetPlan,
  adminSetRole,
  adminStats,
  adminToolLeaderboard,
  adminUsageSearch,
  adminUserHistory,
  downloadCsv,
  adminRestoreContactMessage,
  type ActiveUser,
  type AdminStats,
  type AdminUser,
  type AuditRow,
  type ContactMessageRow,
  type DailyTotal,
  type ToolLeaderRow,
  type UsageSearchRow,
  type UserHistoryRow,
} from "@/lib/admin-api";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/_authenticated/_admin/admin")({
  head: () => ({
    meta: [
      { title: "Admin panel — UniversalTools" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPanel,
});

type Tab =
  | "overview"
  | "live"
  | "users"
  | "usage"
  | "audit"
  | "contact";

function AdminPanel() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [err, setErr] = useState<string | null>(null);

  const SUPER_ADMIN_ID = "f0a17059-c9ac-46e1-859c-82bd1487f069";

  const isSuperAdmin =
    user?.id === SUPER_ADMIN_ID ||
    user?.email?.toLowerCase() === "prashantnadar18@gmail.com";

  return (
    <Layout>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Admin panel</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Signed in as {user?.email}</p>
          </div>
          {/* <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">ADMIN</span> */}
          {isSuperAdmin ? (
            <span className="rounded-full bg-blue-400 dark:bg-blue-500 px-2 py-1 text-xs font-bold text-white dark:text-white animate-pulse">
              👑 SUPER ADMIN
            </span>
          ) : (
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
              ADMIN
            </span>
          )}
        </div>

        <nav className="mt-6 flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-800">
          {(["overview", "live", "users", "usage", "audit", "contact"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${tab === t
                ? "border-b-2 border-blue-600 text-blue-700 dark:text-blue-300"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
            >
              {t === "audit" ? "Audit logs" : t === "usage" ? "Usage logs" : t}
            </button>
          ))}
        </nav>

        {err && <div role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{err}</div>}

        <div className="mt-6">
          {tab === "overview" && <OverviewTab onErr={setErr} />}
          {tab === "live" && <LiveTab onErr={setErr} />}
          {tab === "users" && <UsersTab onErr={setErr} currentUserId={user?.id} />}
          {tab === "usage" && <UsageTab onErr={setErr} />}
          {tab === "audit" && <AuditTab onErr={setErr} />}
          {tab === "contact" && <ContactMessagesTab onErr={setErr} />}
        </div>
      </section>
    </Layout>
  );
}

/* -------------------- Overview -------------------- */
function OverviewTab({ onErr }: { onErr: (m: string | null) => void }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [daily, setDaily] = useState<DailyTotal[]>([]);
  const [leaders, setLeaders] = useState<ToolLeaderRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true); onErr(null);
    try {
      const [s, d, l] = await Promise.all([adminStats(), adminDailyTotals(30), adminToolLeaderboard(7)]);
      setStats(s); setDaily(d); setLeaders(l);
    } catch (e) { onErr((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const chartData = useMemo(() => daily.map((d) => ({
    day: d.day.slice(5),
    signed_in: Number(d.signed_in_uses),
    guest: Number(d.guest_uses),
  })), [daily]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total users (DB)" value={stats?.total_users ?? "…"} />
        <Stat label="Signed-in active 24h" value={stats?.signed_in_active_24h ?? "…"} />
        <Stat label="Signed-in active 7d" value={stats?.signed_in_active_7d ?? "…"} />
        <Stat label="Guests active 24h" value={stats?.guest_active_24h ?? "…"} />
        <Stat label="Premium users" value={stats?.premium_users ?? "…"} />
        <Stat label="Admins" value={stats?.admins ?? "…"} />
        <Stat label="Tool uses 24h" value={stats?.usage_24h ?? "…"} />
        <Stat label="Guest uses 24h" value={stats?.guest_usage_24h ?? "…"} />
      </div>

      {stats?.plan_breakdown && (
        <Card title="Plan breakdown (active subscriptions)">
          <div className="flex flex-wrap gap-3">
            {Object.entries(stats.plan_breakdown).map(([plan, n]) => (
              <div key={plan} className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
                <div className="text-xs uppercase text-slate-500">{plan}</div>
                <div className="text-lg font-semibold tabular-nums text-slate-900 dark:text-white">{n as number}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title="Uses per day (last 30 days)">
        {loading ? <p className="text-sm text-slate-500">Loading…</p> : (
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Legend />
                <Bar dataKey="signed_in" stackId="a" fill="#2563eb" name="Signed-in" />
                <Bar dataKey="guest" stackId="a" fill="#94a3b8" name="Guests" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card title="Tool leaderboard (last 7 days)">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr><th className="py-2">Tool</th><th>Total</th><th>Signed-in</th><th>Guest</th><th>Unique actors</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {leaders.map((r) => (
                <tr key={r.tool_slug}>
                  <td className="py-2 font-mono text-slate-800 dark:text-slate-200">{r.tool_slug}</td>
                  <td className="tabular-nums">{r.total}</td>
                  <td className="tabular-nums">{r.signed_in}</td>
                  <td className="tabular-nums">{r.guest}</td>
                  <td className="tabular-nums">{r.unique_actors}</td>
                </tr>
              ))}
              {!leaders.length && <tr><td colSpan={5} className="py-4 text-sm text-slate-500">No usage yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* -------------------- Live -------------------- */
function LiveTab({ onErr }: { onErr: (m: string | null) => void }) {
  const [rows, setRows] = useState<ActiveUser[]>([]);
  const [minutes, setMinutes] = useState(5);
  const [loading, setLoading] = useState(true);
  const timer = useRef<number | null>(null);

  async function load() {
    try {
      const data = await adminActiveUsers(minutes);
      setRows(data);
      onErr(null);
    } catch (e) { onErr((e as Error).message); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    setLoading(true); load();
    // Realtime: refresh instantly on any new tool_usage / guest_usage insert.
    const ch = supabase
      .channel("admin-live-usage")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "tool_usage" }, () => load())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "guest_usage" }, () => load())
      .subscribe();
    // Polling fallback (portable to hosts without Realtime).
    timer.current = window.setInterval(load, 30_000);
    return () => {
      supabase.removeChannel(ch);
      if (timer.current) window.clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minutes]);

  return (
    <Card
      title={`Active in the last ${minutes} min (${rows.length})`}
      right={
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Window</label>
          <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white">
            <option value={2}>2 min</option>
            <option value={5}>5 min</option>
            <option value={15}>15 min</option>
            <option value={60}>1 hour</option>
          </select>
          <span className="ml-2 inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> live
          </span>
        </div>
      }
    >
      {loading ? <p className="text-sm text-slate-500">Loading…</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Kind</th><th>Actor</th><th>Plan</th>
                <th>Current tool</th><th>Uses</th><th>Country</th><th>Last seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((r) => (
                <tr key={r.kind + r.actor_key}>
                  <td className="py-2"><KindBadge kind={r.kind} /></td>
                  <td className="text-slate-800 dark:text-slate-200">
                    {r.kind === "user"
                      ? (r.email || r.display_name || r.actor_key.slice(0, 8))
                      : <span className="font-mono text-xs">guest·{r.actor_key.slice(0, 8)}</span>}
                  </td>
                  <td><PlanBadge plan={r.plan} /></td>
                  <td className="font-mono text-xs">{r.last_tool_slug}</td>
                  <td className="tabular-nums">{r.uses_in_window}</td>
                  <td className="text-xs">{r.country_code || "—"}</td>
                  <td className="text-xs text-slate-500">{new Date(r.last_seen).toLocaleTimeString()}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={7} className="py-4 text-sm text-slate-500">No active users right now.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/* -------------------- Users -------------------- */
function UsersTab({ onErr, currentUserId }: { onErr: (m: string | null) => void; currentUserId?: string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "free" | "premium" | "admin">("all");
  const [drawer, setDrawer] = useState<{ user: AdminUser; rows: UserHistoryRow[] } | null>(null);

  async function load() {
    setLoading(true); onErr(null);
    try { setUsers(await adminListUsers(200, 0)); }
    catch (e) { onErr((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    load();
  }, []);
  const filtered = users.filter((u) => {
    if (filter === "all") return true;
    if (filter === "admin") return u.is_admin;
    return u.plan === filter;
  });

  async function togglePlan(u: AdminUser) {
    if (u.email?.toLowerCase() === "prashantnadar18@gmail.com") {
      alert("Super Admin plan cannot be changed.");
      return;
    }
    setBusyId(u.user_id);
    try { await adminSetPlan(u.user_id, u.plan === "premium" ? "free" : "premium"); await load(); }
    catch (e) { onErr((e as Error).message); }
    finally { setBusyId(null); }
  }
  async function toggleAdmin(u: AdminUser) {
    if (u.email?.toLowerCase() === "prashantnadar18@gmail.com") {
      alert("Super Admin role cannot be modified.");
      return;
    }
    if (!confirm(u.is_admin ? `Revoke admin from ${u.email}?` : `Grant admin to ${u.email}?`)) return;
    setBusyId(u.user_id);
    try { await adminSetRole(u.user_id, "admin", !u.is_admin); await load(); }
    catch (e) { onErr((e as Error).message); }
    finally { setBusyId(null); }
  }
  async function openHistory(u: AdminUser) {
    try {
      const rows = await adminUserHistory(u.user_id, 100, 0);
      setDrawer({ user: u, rows });
    } catch (e) { onErr((e as Error).message); }
  }

  return (
    <Card
      title={`Users (${filtered.length})`}
      right={
        <div className="flex items-center gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value as "all" | "free" | "premium" | "admin")}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white">
            <option value="all">All</option>
            <option value="free">Free</option>
            <option value="premium">Premium</option>
            <option value="admin">Admins</option>
          </select>
          <button onClick={load} className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium dark:border-slate-700 dark:text-white">Refresh</button>
        </div>
      }
    >
      {loading ? <p className="text-sm text-slate-500">Loading…</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr><th className="py-2">Email</th><th>Plan</th><th>Role</th><th>Uses 24h</th><th>Joined</th><th className="text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((u) => (
                <tr key={u.user_id}>
                  <td className="py-2 text-slate-800 dark:text-slate-200">{u.email}</td>
                  <td><PlanBadge plan={u.plan} /></td>
                  <td>
                    {u.email?.toLowerCase() === "prashantnadar18@gmail.com" ? (
                      <span className="rounded-full bg-blue-400 dark:bg-blue-500 px-2 py-1 text-xs font-bold text-white dark:text-white animate-pulse">
                        👑 SUPER ADMIN
                      </span>
                    ) : u.is_admin ? (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 animate-pulse">
                        ADMIN
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">USER</span>
                    )}
                  </td>
                  <td className="tabular-nums">{u.usage_24h}</td>
                  <td className="text-xs text-slate-500">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="py-2 text-right">
                    <button onClick={() => openHistory(u)} className="mr-2 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium dark:border-slate-700 dark:text-white">History</button>
                    <button
                      onClick={() => togglePlan(u)}
                      className="mr-2 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium disabled:opacity-50 dark:border-slate-700 dark:text-white"
                      disabled={
                        busyId === u.user_id ||
                        u.email?.toLowerCase() === "prashantnadar18@gmail.com"
                      }
                    >
                      {u.plan === "premium" ? "Downgrade" : "Upgrade"}
                    </button>
                    <button
                      onClick={() => toggleAdmin(u)}
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium disabled:opacity-50 dark:border-slate-700 dark:text-white"
                      disabled={
                        busyId === u.user_id ||
                        u.user_id === currentUserId ||
                        u.email?.toLowerCase() === "prashantnadar18@gmail.com"
                      }
                    >
                      {u.is_admin ? "Revoke admin" : "Make admin"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {drawer && (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/40" onClick={() => setDrawer(null)}>
          <div onClick={(e) => e.stopPropagation()} className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">History — {drawer.user.email}</h3>
              <button onClick={() => setDrawer(null)} className="text-slate-500 hover:text-slate-900 dark:hover:text-white">✕</button>
            </div>
            <p className="mt-1 text-xs text-slate-500">Last {drawer.rows.length} tool uses</p>
            <ul className="mt-4 divide-y divide-slate-100 text-sm dark:divide-slate-800">
              {drawer.rows.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2">
                  <span className="font-mono text-slate-700 dark:text-slate-300">{r.tool_slug}</span>
                  <span className="text-xs text-slate-500">{new Date(r.created_at).toLocaleString()}</span>
                </li>
              ))}
              {!drawer.rows.length && <li className="py-4 text-slate-500">No usage recorded.</li>}
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
}

/* -------------------- Usage logs -------------------- */
function UsageTab({ onErr }: { onErr: (m: string | null) => void }) {
  const [rows, setRows] = useState<UsageSearchRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [tool, setTool] = useState("");
  const [actor, setActor] = useState("");
  const [kind, setKind] = useState<"all" | "user" | "guest">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  async function load(newOffset = 0) {
    setLoading(true); onErr(null);
    try {
      const data = await adminUsageSearch({
        tool: tool || null, actor: actor || null,
        from: from ? new Date(from).toISOString() : null,
        to: to ? new Date(to).toISOString() : null,
        kind, limit: 100, offset: newOffset,
      });
      setRows(data); setOffset(newOffset);
    } catch (e) { onErr((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(0); /* eslint-disable-next-line */ }, []);

  function exportCsv() {
    const qs = new URLSearchParams();
    if (tool) qs.set("tool", tool);
    if (actor) qs.set("actor", actor);
    if (kind !== "all") qs.set("kind", kind);
    if (from) qs.set("from", new Date(from).toISOString());
    if (to) qs.set("to", new Date(to).toISOString());
    downloadCsv(`/api/admin/export/tool-usage?${qs.toString()}`, `tool-usage-${new Date().toISOString().slice(0, 10)}.csv`)
      .catch((e) => onErr((e as Error).message));
  }

  return (
    <Card title="Usage logs" right={
      <button onClick={exportCsv} className="rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700">Export CSV</button>
    }>
      <div className="mb-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Input label="Tool slug" value={tool} onChange={setTool} placeholder="pdf-merge" />
        <Input label="Actor (user id)" value={actor} onChange={setActor} placeholder="uuid" />
        <div>
          <label className="text-xs text-slate-500">Kind</label>
          <select value={kind} onChange={(e) => setKind(e.target.value as "all" | "user" | "guest")}
            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white">
            <option value="all">All</option><option value="user">Signed-in</option><option value="guest">Guest</option>
          </select>
        </div>
        <Input label="From" type="datetime-local" value={from} onChange={setFrom} />
        <Input label="To" type="datetime-local" value={to} onChange={setTo} />
        <div className="flex items-end"><button onClick={() => load(0)} className="w-full rounded-md border border-slate-200 px-3 py-1 text-sm font-medium dark:border-slate-700 dark:text-white">Search</button></div>
      </div>
      {loading ? <p className="text-sm text-slate-500">Loading…</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr><th className="py-2">When</th><th>Kind</th><th>Actor</th><th>Tool</th><th>Country</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="py-2 text-xs text-slate-500">{new Date(r.created_at).toLocaleString()}</td>
                  <td><KindBadge kind={r.kind} /></td>
                  <td className="text-slate-800 dark:text-slate-200">{r.kind === "user" ? (r.email || r.actor_key.slice(0, 8)) : <span className="font-mono text-xs">guest·{r.actor_key.slice(0, 8)}</span>}</td>
                  <td className="font-mono text-xs">{r.tool_slug}</td>
                  <td className="text-xs">{r.country_code || "—"}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={5} className="py-4 text-sm text-slate-500">No rows match.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <Pager offset={offset} count={rows.length} onPage={load} />
    </Card>
  );
}

/* -------------------- Audit logs -------------------- */
function AuditTab({ onErr }: { onErr: (m: string | null) => void }) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [action, setAction] = useState("");
  const [actor, setActor] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  async function load(newOffset = 0) {
    setLoading(true); onErr(null);
    try {
      const data = await adminAuditSearch({
        action: action || null, actor: actor || null,
        from: from ? new Date(from).toISOString() : null,
        to: to ? new Date(to).toISOString() : null,
        limit: 100, offset: newOffset,
      });
      setRows(data); setOffset(newOffset);
    } catch (e) { onErr((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(0); /* eslint-disable-next-line */ }, []);

  function exportCsv() {
    const qs = new URLSearchParams();
    if (action) qs.set("action", action);
    if (actor) qs.set("actor", actor);
    if (from) qs.set("from", new Date(from).toISOString());
    if (to) qs.set("to", new Date(to).toISOString());
    downloadCsv(`/api/admin/export/audit-logs?${qs.toString()}`, `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`)
      .catch((e) => onErr((e as Error).message));
  }

  return (
    <Card title="Audit logs" right={
      <button onClick={exportCsv} className="rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700">Export CSV</button>
    }>
      <div className="mb-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <Input label="Action" value={action} onChange={setAction} placeholder="admin_set_plan" />
        <Input label="Actor (user id)" value={actor} onChange={setActor} placeholder="uuid" />
        <Input label="From" type="datetime-local" value={from} onChange={setFrom} />
        <Input label="To" type="datetime-local" value={to} onChange={setTo} />
        <div className="flex items-end"><button onClick={() => load(0)} className="w-full rounded-md border border-slate-200 px-3 py-1 text-sm font-medium dark:border-slate-700 dark:text-white">Search</button></div>
      </div>
      {loading ? <p className="text-sm text-slate-500">Loading…</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr><th className="py-2">When</th><th>Actor</th><th>Action</th><th>Metadata</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="py-2 text-xs text-slate-500">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="text-slate-800 dark:text-slate-200">{r.email || (r.actor_id ? r.actor_id.slice(0, 8) : "—")}</td>
                  <td className="font-mono text-xs">{r.action}</td>
                  <td className="max-w-[24rem] truncate text-xs text-slate-500" title={JSON.stringify(r.metadata)}>{JSON.stringify(r.metadata)}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={4} className="py-4 text-sm text-slate-500">No rows match.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <Pager offset={offset} count={rows.length} onPage={load} />
    </Card>
  );
}

/* -------------------- Primitives -------------------- */
function Card({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-slate-900 dark:text-white">{title}</h2>
        {right}
      </div>
      {children}
    </div>
  );
}

/* -------------------- Contact Messages -------------------- */

function ContactMessagesTab({
  onErr,
}: {
  onErr: (m: string | null) => void;
}) {
  const [messages, setMessages] = useState<ContactMessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [view, setView] = useState<"inbox" | "archived">("inbox");

  async function load() {
    console.log("Current view:", view);
    setLoading(true);

    try {
      let rows: ContactMessageRow[];

      if (view === "inbox") {
        rows = await adminListContactMessages();
      } else {
        rows = await adminListArchivedContactMessages();
      }

      setMessages(rows);

      onErr(null);
    } catch (e) {
      onErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [view]);

  async function toggleRead(row: ContactMessageRow) {
    setBusyId(row.id);

    try {
      await adminMarkContactRead(row.id, !row.is_read);

      await load();
    } catch (e) {
      onErr((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(row: ContactMessageRow) {
    setBusyId(row.id);

    try {

      if (view === "inbox") {

        if (!confirm("Archive this message?")) return;

        await adminArchiveContactMessage(row.id);

      } else {

        if (!confirm("Restore this message?")) return;

        await adminRestoreContactMessage(row.id);

      }

      await load();

    } catch (e) {

      onErr((e as Error).message);

    } finally {

      setBusyId(null);

    }
  }

  const [selected, setSelected] = useState<ContactMessageRow | null>(null);
  return (
    <Card
      title={`${view === "inbox"
        ? "Contact Messages"
        : "Archived Messages"
        } (${messages.length})`}
      right={
        <div className="flex items-center gap-2">

          <button
            onClick={() => setView("inbox")}
            className={`rounded-md px-3 py-1 text-xs font-medium ${view === "inbox"
              ? "bg-blue-600 text-white"
              : "border border-slate-300"
              }`}
          >
            Inbox
          </button>

          <button
            onClick={() => setView("archived")}
            className={`rounded-md px-3 py-1 text-xs font-medium ${view === "archived"
              ? "bg-blue-600 text-white"
              : "border border-slate-300"
              }`}
          >
            Archived
          </button>

          <button
            onClick={load}
            className="rounded-md border border-slate-300 px-3 py-1 text-xs"
          >
            Refresh
          </button>

        </ div>
      }
    >
      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Name</th>
                <th>Email</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Date</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {messages.map((row) => (
                <tr key={row.id}>
                  <td className="py-3 font-medium text-slate-900 dark:text-white">
                    {row.name}
                  </td>

                  <td>
                    <a
                      href={`mailto:${row.email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {row.email}
                    </a>
                  </td>

                  <td className="max-w-xs truncate">
                    {row.subject}
                  </td>

                  <td>
                    {row.is_read ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                        Read
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                        Unread
                      </span>
                    )}
                  </td>

                  <td className="text-xs text-slate-500">
                    {new Date(row.created_at).toLocaleString()}
                  </td>

                  <td className="text-right">
                    <button
                      onClick={() => setSelected(row)}
                      className="mr-2 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium dark:border-slate-700 dark:text-white"
                    >
                      View
                    </button>

                    <button
                      disabled={busyId === row.id}
                      onClick={() => toggleRead(row)}
                      className="mr-2 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium disabled:opacity-50 dark:border-slate-700 dark:text-white"
                    >
                      {row.is_read ? "Unread" : "Read"}
                    </button>

                    <button
                      disabled={busyId === row.id}
                      onClick={() => remove(row)}
                      className="rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      Archive
                    </button>
                  </td>
                </tr>
              ))}

              {!messages.length && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-6 text-center text-sm text-slate-500"
                  >
                    No contact messages found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40"
          onClick={() => setSelected(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="h-full w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-xl dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                Contact Message
              </h2>

              <button
                onClick={() => setSelected(null)}
                className="text-xl text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-5">

              <div>
                <p className="text-xs uppercase text-slate-500">Name</p>
                <p className="mt-1 font-medium text-slate-900 dark:text-white">
                  {selected.name}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-slate-500">Email</p>

                <a
                  href={`mailto:${selected.email}`}
                  className="mt-1 block text-blue-600 hover:underline"
                >
                  {selected.email}
                </a>
              </div>

              <div>
                <p className="text-xs uppercase text-slate-500">Subject</p>

                <p className="mt-1 font-medium text-slate-900 dark:text-white">
                  {selected.subject}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-slate-500">Received</p>

                <p className="mt-1 text-slate-700 dark:text-slate-300">
                  {new Date(selected.created_at).toLocaleString()}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-slate-500">Message</p>

                <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-4 whitespace-pre-wrap text-sm leading-7 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                  {selected.message}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{value}</div>
    </div>
  );
}
function PlanBadge({ plan }: { plan: string }) {
  const cls = plan === "premium" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
    : plan === "admin" ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
      : plan === "guest" ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{plan}</span>;
}
function KindBadge({ kind }: { kind: "user" | "guest" }) {
  const cls = kind === "user" ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{kind}</span>;
}
function Input({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="text-xs text-slate-500">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
    </div>
  );
}
function Pager({ offset, count, onPage }: { offset: number; count: number; onPage: (o: number) => void }) {
  return (
    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
      <span>Rows {offset + 1}–{offset + count}</span>
      <div className="flex gap-2">
        <button disabled={offset === 0} onClick={() => onPage(Math.max(0, offset - 100))}
          className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-40 dark:border-slate-700 dark:text-white">Prev</button>
        <button disabled={count < 100} onClick={() => onPage(offset + 100)}
          className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-40 dark:border-slate-700 dark:text-white">Next</button>
      </div>
    </div>
  );
}
