import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { FullPageSpinner } from "./components/Spinner";
import { NotFound } from "./components/NotFound";
import { runAdminBootstrapAudit } from "./lib/admin-bootstrap-guard";

// Boot-time safety net: no hardcoded admin bootstrap emails may exist in
// client code. Admin role is granted only via the admin_set_role RPC by an
// existing admin — see src/lib/admin-bootstrap-guard.ts for the invariant.
runAdminBootstrapAudit({ NODE_ENV: import.meta.env.MODE });

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Performance: preload route chunks on link hover/focus
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    // Show spinner quickly when a route chunk is still loading
    defaultPendingComponent: () => <FullPageSpinner />,
    defaultPendingMs: 200,
    defaultPendingMinMs: 200,
    defaultNotFoundComponent: () => <NotFound />,
  });

  return router;
};
