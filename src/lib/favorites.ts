const KEY = "ut-favorites";
const listeners = new Set<() => void>();

export function getFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function isFavorite(id: string): boolean {
  return getFavorites().includes(id);
}

export function toggleFavorite(id: string): boolean {
  const cur = getFavorites();
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
  localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
  return next.includes(id);
}

export function subscribeFavorites(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
