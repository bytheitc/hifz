import type { TrackedPortion } from "./srs";

/**
 * Everything is kept in the browser.
 *
 * What a person has and has not memorised of the Qur'an is about as personal
 * as data gets, and there is no feature in this app that a server would make
 * possible. So there is no account, no sync and nothing to breach — and, as a
 * side effect, a contributor can run the whole project with `pnpm dev` and no
 * credentials. Export to a file (see ISSUES.md) is the right answer to
 * "but what if I change phone", not a backend.
 */

const STORAGE_KEY = "hifz-trail:portions:v1";

export function loadPortions(): TrackedPortion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isTrackedPortion);
  } catch {
    // localStorage exists but throws in private mode and some webviews.
    // An empty trail beats a blank screen.
    return [];
  }
}

export function savePortions(portions: readonly TrackedPortion[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(portions));
  } catch {
    // Quota or a disabled store. Losing the write is survivable.
  }
}

function isTrackedPortion(value: unknown): value is TrackedPortion {
  if (typeof value !== "object" || value === null) return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.id === "string" &&
    typeof c.surah === "number" &&
    typeof c.fromAyah === "number" &&
    typeof c.toAyah === "number" &&
    typeof c.box === "number" &&
    typeof c.addedOn === "string" &&
    typeof c.lapses === "number"
  );
}
