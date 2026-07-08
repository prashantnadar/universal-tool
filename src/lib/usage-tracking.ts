import { pushRecent } from "./recently-used";
import { checkAndRecord, newIdempotencyKey, type UsageResult } from "./usage-limits";
import { logUsage } from "./usage-log";

const KEY = "ut-usage-counts";
const listeners = new Set<() => void>();

type Counts = Record<string, number>;

export function getCounts(): Counts {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

/**
 * Categories that are metered server-side (guest=3, free=10, premium=unlimited).
 * All other tool categories run unlimited for everyone.
 */
export type MeteredCategory = "pdf" | "image";
const METERED_PREFIXES: Record<MeteredCategory, string[]> = {
  pdf: ["pdf-"],
  image: ["img-"],
};

function categoryFor(id: string): MeteredCategory | null {
  if (METERED_PREFIXES.pdf.some((p) => id.startsWith(p))) return "pdf";
  if (METERED_PREFIXES.image.some((p) => id.startsWith(p))) return "image";
  return null;
}

export function isMetered(id: string): boolean {
  return categoryFor(id) !== null;
}

// ---- Server-side usage state (metered categories only) --------------------
const meteredState: { latest: UsageResult | null } = { latest: null };
const meteredListeners = new Set<() => void>();

export function getMeteredUsage(): UsageResult | null {
  return meteredState.latest;
}

export function subscribeMeteredUsage(cb: () => void): () => void {
  meteredListeners.add(cb);
  return () => meteredListeners.delete(cb);
}

function setMetered(u: UsageResult) {
  meteredState.latest = u;
  meteredListeners.forEach((l) => l());
}

export function trackUse(id: string) {
  if (typeof window === "undefined") return;
  const c = getCounts();
  c[id] = (c[id] || 0) + 1;
  localStorage.setItem(KEY, JSON.stringify(c));
  pushRecent(id);
  listeners.forEach((l) => l());

  // Server-side metering for PDF & Image tools only.
  if (isMetered(id)) {
    const key = newIdempotencyKey();
    void checkAndRecord(id, key).then((res) => {
      setMetered(res);
      if (res.allowed) {
        logUsage("success", { tool: id, key, plan: res.plan, used: res.used, limit: res.limit, remaining: res.remaining });
      } else {
        logUsage("blocked", { tool: id, key, plan: res.plan, used: res.used, limit: res.limit, remaining: res.remaining });
      }
    });
  }
}

export function getTopUsed(limit = 3): { id: string; count: number }[] {
  const c = getCounts();
  return Object.entries(c)
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function subscribeUsage(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
