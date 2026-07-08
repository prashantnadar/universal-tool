import Swal from "sweetalert2";
import type { UsageResult } from "./usage-limits";

/**
 * Show the "Daily limit reached" modal. Matches the banner copy.
 * Returns a promise resolving after the user dismisses / clicks a CTA.
 */
export function showLimitReachedModal(usage: UsageResult | null) {
  const used = usage?.used ?? 0;
  const limit = usage?.limit ?? 0;
  const isGuest = (usage?.plan ?? "guest") === "guest";

  const body = isGuest
    ? "Sign up for a free account to get 10 tools per day, or upgrade to Premium for unlimited access."
    : "Upgrade to Premium for unlimited daily tool usage.";

  return Swal.fire({
    icon: "warning",
    title: `Daily limit reached (${used}/${limit})`,
    text: body,
    showCancelButton: true,
    showDenyButton: isGuest,
    confirmButtonText: isGuest ? "Sign up free" : "Upgrade to Premium",
    denyButtonText: "View pricing",
    cancelButtonText: "Close",
    confirmButtonColor: "#2563eb",
    denyButtonColor: "#7c3aed",
    cancelButtonColor: "#64748b",
    reverseButtons: true,
    focusConfirm: true,
  }).then((res) => {
    if (res.isConfirmed) {
      // Guest → sign up; Free user → upgrade page.
      window.location.href = isGuest ? "/auth" : "/pricing";
    } else if (res.isDenied) {
      window.location.href = "/pricing";
    }
  });
}
