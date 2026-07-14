import { supabase } from "@/integrations/supabase/client";

export type AdminUser = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  plan: "free" | "premium";
  is_admin: boolean;
  created_at: string;
  usage_24h: number;
};

export type AdminStats = {
  total_users: number;
  signed_in_active_24h: number;
  signed_in_active_7d: number;
  guest_active_24h: number;
  guest_active_7d: number;
  premium_users: number;
  admins: number;
  usage_24h: number;
  usage_7d: number;
  guest_usage_24h: number;
  guest_usage_7d: number;
  plan_breakdown: Record<string, number>;
  top_tools_24h: { tool_slug: string; uses: number }[];
};

export type ActiveUser = {
  kind: "user" | "guest";
  actor_key: string;
  email: string | null;
  display_name: string | null;
  plan: string;
  last_tool_slug: string;
  last_seen: string;
  uses_in_window: number;
  country_code: string | null;
};

export type DailyTotal = {
  day: string;
  signed_in_uses: number;
  guest_uses: number;
  unique_users: number;
  unique_guests: number;
  top_tool: string | null;
};

export type ToolLeaderRow = {
  tool_slug: string;
  total: number;
  signed_in: number;
  guest: number;
  unique_actors: number;
};

export type UsageSearchRow = {
  kind: "user" | "guest";
  actor_key: string;
  email: string | null;
  tool_slug: string;
  created_at: string;
  country_code: string | null;
};

export type AuditRow = {
  id: string;
  actor_id: string | null;
  email: string | null;
  action: string;
  metadata: unknown;
  created_at: string;
};

export type ContactMessageRow = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

export type UserHistoryRow = {
  id: string;
  tool_slug: string;
  created_at: string;
  country_code: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = supabase.rpc.bind(supabase) as any;

export async function adminListUsers(limit = 100, offset = 0): Promise<AdminUser[]> {
  const { data, error } = await rpc("admin_list_users", { _limit: limit, _offset: offset });
  if (error) throw error;
  return (data ?? []) as AdminUser[];
}

export async function adminSetPlan(userId: string, plan: "free" | "premium") {
  const { error } = await rpc("admin_set_plan", { _target: userId, _plan: plan });
  if (error) throw error;
}

export async function adminSetRole(userId: string, role: "admin" | "user", grant: boolean) {
  const { error } = await rpc("admin_set_role", { _target: userId, _role: role, _grant: grant });
  if (error) throw error;
}

export async function adminStats(): Promise<AdminStats> {
  const { data, error } = await rpc("admin_stats");
  if (error) throw error;
  return data as AdminStats;
}

export async function adminActiveUsers(minutes = 5): Promise<ActiveUser[]> {
  const { data, error } = await rpc("admin_active_users", { _minutes: minutes });
  if (error) throw error;
  return (data ?? []) as ActiveUser[];
}

export async function adminDailyTotals(days = 30): Promise<DailyTotal[]> {
  const { data, error } = await rpc("admin_daily_totals", { _days: days });
  if (error) throw error;
  return (data ?? []) as DailyTotal[];
}

export async function adminToolLeaderboard(days = 7): Promise<ToolLeaderRow[]> {
  const { data, error } = await rpc("admin_tool_leaderboard", { _days: days });
  if (error) throw error;
  return (data ?? []) as ToolLeaderRow[];
}

export async function adminUserHistory(
  userId: string,
  limit = 100,
  offset = 0,
): Promise<UserHistoryRow[]> {
  const { data, error } = await rpc("admin_user_history", {
    _target: userId,
    _limit: limit,
    _offset: offset,
  });
  if (error) throw error;
  return (data ?? []) as UserHistoryRow[];
}

export type UsageSearchFilters = {
  actor?: string | null;
  tool?: string | null;
  from?: string | null;
  to?: string | null;
  kind?: "all" | "user" | "guest";
  limit?: number;
  offset?: number;
};

export async function adminUsageSearch(f: UsageSearchFilters = {}): Promise<UsageSearchRow[]> {
  const { data, error } = await rpc("admin_usage_search", {
    _actor: f.actor ?? null,
    _tool: f.tool ?? null,
    _from: f.from ?? null,
    _to: f.to ?? null,
    _kind: f.kind ?? "all",
    _limit: f.limit ?? 100,
    _offset: f.offset ?? 0,
  });
  if (error) throw error;
  return (data ?? []) as UsageSearchRow[];
}

export type AuditSearchFilters = {
  actor?: string | null;
  action?: string | null;
  from?: string | null;
  to?: string | null;
  limit?: number;
  offset?: number;
};

export async function adminAuditSearch(f: AuditSearchFilters = {}): Promise<AuditRow[]> {
  const { data, error } = await rpc("admin_audit_search", {
    _actor: f.actor ?? null,
    _action: f.action ?? null,
    _from: f.from ?? null,
    _to: f.to ?? null,
    _limit: f.limit ?? 100,
    _offset: f.offset ?? 0,
  });
  if (error) throw error;
  return (data ?? []) as AuditRow[];
}

export async function adminListContactMessages(
  limit = 100,
  offset = 0,
): Promise<ContactMessageRow[]> {
  const { data, error } = await rpc("admin_list_contact_messages", {
    _limit: limit,
    _offset: offset,
  });

  if (error) throw error;

  return (data ?? []) as ContactMessageRow[];
}

export async function adminMarkContactRead(id: string, isRead: boolean) {
  const { error } = await rpc("admin_mark_contact_read", {
    _id: id,
    _is_read: isRead,
  });

  if (error) throw error;
}

export async function adminDeleteContactMessage(id: string) {
  const { error } = await rpc("admin_delete_contact_message", {
    _id: id,
  });

  if (error) throw error;
}

/** Trigger a CSV download using the current session's bearer token. */
export async function downloadCsv(path: string, filename: string) {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) throw new Error("Not signed in");
  const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Export failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}
