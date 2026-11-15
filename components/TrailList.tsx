"use client";

import { describePortion } from "@/lib/quran";
import { type TrackedPortion, dueDate } from "@/lib/srs";

export function TrailList({
  portions,
  onRemove,
}: {
  portions: readonly TrackedPortion[];
  onRemove: (id: string) => void;
}) {
  const sorted = [...portions].sort(
    (a, b) => a.surah - b.surah || a.fromAyah - b.fromAyah
  );

  return (
    <ul className="space-y-1.5">
      {sorted.map((portion) => (
        <li
          key={portion.id}
          className="flex items-center gap-3 rounded-xl border border-[var(--color-rule)] px-3 py-2 text-sm dark:border-white/10"
        >
          <span className="min-w-0 flex-1 truncate">{describePortion(portion)}</span>
          <span className="shrink-0 text-xs tabular-nums text-[var(--color-ink-soft)] dark:text-white/50">
            box {portion.box} · {dueDate(portion)}
          </span>
          <button
            type="button"
            aria-label={`Remove ${describePortion(portion)}`}
            onClick={() => onRemove(portion.id)}
            className="-mr-1 shrink-0 px-2 py-1 text-xs text-[var(--color-ink-soft)] hover:underline dark:text-white/50"
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}
