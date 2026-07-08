import { createFileRoute, Outlet, Link, useRouter, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert, Loader2 } from "lucide-react";
import { logUsage } from "@/lib/usage-log";

type GateState =
  | { status: "checking" }
  | { status: "ok" }
  | { status: "denied" }
  | { status: "error"; message: string };

function AdminGate() {
  const router = useRouter();
  const [state, setState] = useState<GateState>({ status: "checking" });

  const check = async () => {
    setState({ status: "checking" });
    logUsage("admin_gate", { status: "ok", message: "check_start" });
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      throw redirect({ to: "/auth", search: { redirect: "/admin", mode: "signin" } });
    }
    const { data, error } = await supabase.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (error) {
      logUsage("admin_gate", { status: "error", message: error.message });
      setState({ status: "error", message: error.message });
      return;
    }
    const next: GateState = data ? { status: "ok" } : { status: "denied" };
    logUsage("admin_gate", { status: next.status === "ok" ? "ok" : "denied" });
    setState(next);
  };

  useEffect(() => {
    check().catch(() => {
      /* redirect thrown */
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state.status === "checking") {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying admin access…
      </div>
    );
  }

  if (state.status === "ok") return <Outlet />;

  const isError = state.status === "error";
  return (
    <div className="max-w-lg mx-auto mt-16 px-4">
      <Alert variant="destructive">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Admin access required</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>
            {isError
              ? `We couldn't verify your admin access${state.message ? `: ${state.message}` : ""}. This is usually a temporary connection issue.`
              : "Your account does not have admin permissions. If you believe this is a mistake, contact the workspace owner."}
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => check()}>
              Retry
            </Button>
            <Button size="sm" variant="outline" onClick={() => router.invalidate()}>
              Reload
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link to="/dashboard">Back to dashboard</Link>
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/_admin")({
  component: AdminGate,
});
