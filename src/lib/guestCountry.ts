/**
 * Best-effort 2-letter country code for the current visitor.
 * Cached in localStorage for 7 days. Portable: uses public ipapi.co,
 * no vendor lock. Returns null on failure — country is optional metadata.
 */
const KEY = "ut-country-code";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

let inflight: Promise<string | null> | null = null;

export async function getCountryCode(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const { cc, ts } = JSON.parse(raw) as { cc: string | null; ts: number };
      if (Date.now() - ts < TTL_MS) return cc;
    }
  } catch { /* ignore */ }

  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);
      const res = await fetch("https://ipapi.co/country/", { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error("bad response");
      const text = (await res.text()).trim().toUpperCase();
      const cc = /^[A-Z]{2}$/.test(text) ? text : null;
      localStorage.setItem(KEY, JSON.stringify({ cc, ts: Date.now() }));
      return cc;
    } catch {
      localStorage.setItem(KEY, JSON.stringify({ cc: null, ts: Date.now() }));
      return null;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}
