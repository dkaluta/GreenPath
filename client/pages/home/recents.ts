/**
 * The last few destinations searched for, kept on this device only.
 * Nothing here is sent anywhere.
 */

const KEY = "greenpath.recents";
const MAX = 5;

export function readRecents(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

/** Adds a search to the front, without duplicates, and returns the list. */
export function addRecent(query: string): string[] {
  const next = [query, ...readRecents().filter((q) => q !== query)].slice(
    0,
    MAX,
  );
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private browsing can refuse storage. The search still works.
  }
  return next;
}
