const KEY = "ut-recent-tools";
const MAX = 10;

export function getRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function pushRecent(id: string) {
  if (typeof window === "undefined") return;
  const cur = getRecent().filter((x) => x !== id);
  cur.unshift(id);
  localStorage.setItem(KEY, JSON.stringify(cur.slice(0, MAX)));
}
