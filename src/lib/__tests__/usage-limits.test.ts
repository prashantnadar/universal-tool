import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock is hoisted; use vi.hoisted() so the mock fn survives that hoist.
const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: rpcMock },
}));
vi.mock("../recently-used", () => ({ pushRecent: vi.fn() }));

// Provide minimal DOM/crypto globals for getGuestHash().
beforeEach(() => {
  rpcMock.mockReset();
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  });
  vi.stubGlobal("navigator", { userAgent: "t", language: "en-US" });
  vi.stubGlobal("screen", { width: 1, height: 1 });
});

import { checkAndRecord, refundUsage, newIdempotencyKey } from "../usage-limits";

const ok = (over: Partial<Record<string, unknown>> = {}) => ({
  data: { allowed: true, used: 1, limit: 10, plan: "guest", remaining: 9, ...over },
  error: null,
});
const rpcErr = (msg: string) => ({ data: null, error: { message: msg } });

describe("usage-limits retry + idempotency", () => {
  it("retries transient 503 errors with exponential backoff, then succeeds", async () => {
    rpcMock
      .mockResolvedValueOnce(rpcErr("upstream 503 temporarily unavailable"))
      .mockResolvedValueOnce(rpcErr("fetch failed"))
      .mockResolvedValueOnce(ok());

    const key = newIdempotencyKey();
    const start = Date.now();
    const r = await checkAndRecord("text-upper", key);
    const elapsed = Date.now() - start;

    expect(r.allowed).toBe(true);
    expect(rpcMock).toHaveBeenCalledTimes(3);
    // Backoff base 200ms + 400ms → at least ~500ms with jitter floor.
    expect(elapsed).toBeGreaterThanOrEqual(400);
    // Every retry used the SAME idempotency key on the server (no double charge).
    for (const call of rpcMock.mock.calls) {
      expect(call[1]._idempotency_key).toBe(key);
    }
  });

  it("does not retry on non-transient errors (e.g. permission denied)", async () => {
    rpcMock.mockResolvedValueOnce(rpcErr("permission denied for function has_role"));
    const r = await checkAndRecord("text-upper", newIdempotencyKey());
    expect(r.allowed).toBe(false);
    expect(r.error).toMatch(/permission denied/);
    expect(rpcMock).toHaveBeenCalledTimes(1);
  });

  it("stops after max attempts and returns the last transient error", async () => {
    rpcMock.mockResolvedValue(rpcErr("network timeout"));
    const r = await checkAndRecord("text-upper", newIdempotencyKey());
    expect(r.allowed).toBe(false);
    expect(r.error).toMatch(/network timeout/);
    // 4 attempts total (initial + 3 retries).
    expect(rpcMock).toHaveBeenCalledTimes(4);
  }, 20000);

  it("respects server-side idempotent replay (no double charge)", async () => {
    // Server replays the SAME allowed=true response for the same key.
    const replay = { data: { allowed: true, used: 1, limit: 10, plan: "guest", remaining: 9, idempotent: true }, error: null };
    rpcMock.mockResolvedValueOnce(ok()).mockResolvedValueOnce(replay);

    const key = newIdempotencyKey();
    const first = await checkAndRecord("text-upper", key);
    const second = await checkAndRecord("text-upper", key);

    expect(first.used).toBe(1);
    expect(second.used).toBe(1); // still 1 — server did not increment
    expect(second.idempotent).toBe(true);
  });

  it("refund retries transient failures and returns true on success", async () => {
    rpcMock
      .mockResolvedValueOnce(rpcErr("econnreset"))
      .mockResolvedValueOnce({ data: { refunded: true }, error: null });
    const refunded = await refundUsage(newIdempotencyKey());
    expect(refunded).toBe(true);
    expect(rpcMock).toHaveBeenCalledTimes(2);
  });
});
