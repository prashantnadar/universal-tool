import { useCallback, useEffect, useState } from "react";
import { getUsageStatus, type UsageResult } from "./usage-limits";
import { getMeteredUsage, subscribeMeteredUsage } from "./usage-tracking";
import { UsageLimitBanner } from "@/components/UsageLimitBanner";
import { showLimitReachedModal } from "./limit-modal";

/**
 * Page-level meter for PDF / Image categories.
 * - `banner` — amber "limit reached" banner (same copy as before).
 * - `blocked` — true when quota is exhausted.
 * - `guardClick(e)` — attach as `onClickCapture` on the tools grid.
 *   When blocked, cancels the click and shows a SweetAlert2 modal with
 *   the same messaging as the banner. Buttons stay visually enabled.
 */
export function useMeteredCategory() {
  const [usage, setUsage] = useState<UsageResult | null>(() => getMeteredUsage());

  useEffect(() => {
    let cancelled = false;
    if (!getMeteredUsage()) {
      void getUsageStatus().then((r) => {
        if (!cancelled) setUsage(r);
      });
    }
    const off = subscribeMeteredUsage(() => setUsage(getMeteredUsage()));
    return () => {
      cancelled = true;
      off();
    };
  }, []);

  const blocked = Boolean(
    usage && usage.limit >= 0 && usage.used >= usage.limit,
  );

  const displayed: UsageResult | null = usage
    ? { ...usage, allowed: !blocked }
    : null;

  const banner = <UsageLimitBanner result={displayed} />;

  const guardClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (!blocked) return;
      const target = e.target as HTMLElement | null;
      // Only intercept clicks on actionable controls (buttons / submits).
      const actionable = target?.closest(
        "button, [role='button'], input[type='submit'], input[type='button']",
      );
      if (!actionable) return;
      e.preventDefault();
      e.stopPropagation();
      void showLimitReachedModal(usage);
    },
    [blocked, usage],
  );

  return { usage, blocked, banner, guardClick };
}
