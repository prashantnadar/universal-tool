import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

function csvCell(v: unknown): string {
  if (v == null) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function csvRow(cells: unknown[]): string {
  return cells.map(csvCell).join(",") + "\n";
}

async function requireAdmin(request: Request) {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const auth = request.headers.get("authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) {
    return { error: new Response("Unauthorized", { status: 401 }) };
  }
  const supabase = createClient(url, key, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: u, error: uErr } = await supabase.auth.getUser();
  if (uErr || !u.user) return { error: new Response("Unauthorized", { status: 401 }) };
  const { data: ok, error: rErr } = await supabase.rpc("has_role", {
    _user_id: u.user.id, _role: "admin",
  });
  if (rErr || !ok) return { error: new Response("Forbidden", { status: 403 }) };
  return { supabase, userId: u.user.id };
}

export const Route = createFileRoute("/api/admin/export/tool-usage")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const gate = await requireAdmin(request);
        if ("error" in gate) return gate.error;
        const { supabase, userId } = gate;
        const url = new URL(request.url);
        const from = url.searchParams.get("from");
        const to = url.searchParams.get("to");
        const actor = url.searchParams.get("actor");
        const tool = url.searchParams.get("tool");
        const kind = (url.searchParams.get("kind") || "all") as "all" | "user" | "guest";

        const PAGE = 1000;
        let offset = 0;
        let total = 0;

        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const enc = new TextEncoder();
            controller.enqueue(enc.encode(csvRow(["kind","actor_key","email","tool_slug","created_at","country_code"])));
            try {
              // eslint-disable-next-line no-constant-condition
              while (true) {
                const { data, error } = await supabase.rpc("admin_usage_search", {
                  _actor: actor, _tool: tool, _from: from, _to: to,
                  _kind: kind, _limit: PAGE, _offset: offset,
                });
                if (error) throw error;
                const rows = (data ?? []) as Array<Record<string, unknown>>;
                if (!rows.length) break;
                for (const r of rows) {
                  controller.enqueue(enc.encode(csvRow([
                    r.kind, r.actor_key, r.email, r.tool_slug, r.created_at, r.country_code,
                  ])));
                }
                total += rows.length;
                if (rows.length < PAGE) break;
                offset += PAGE;
              }
              await supabase.from("audit_logs").insert({
                actor_id: userId, action: "admin_export_tool_usage_csv",
                metadata: { from, to, actor, tool, kind, rows: total },
              });
            } catch (e) {
              controller.enqueue(enc.encode(`# error: ${(e as Error).message}\n`));
            } finally {
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="tool-usage-${new Date().toISOString().slice(0,10)}.csv"`,
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
