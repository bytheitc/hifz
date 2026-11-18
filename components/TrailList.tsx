"use client";

import { describePortion } from "@/lib/quran";
import { type Ladder, type TrackedPortion, REVIEW_INTERVALS_DAYS, dueDate, effectiveBox } from "@/lib/srs";

export function TrailList({
  portions,
  onRemove,
  ladder = REVIEW_INTERVALS_DAYS,
}: {
  ladder?: Ladder;
  portions: readonly TrackedPortion[];
  onRemove: (id: string) => void;
}) {
  const sorted = [...portions].sort(
    (a, b) => a.surah - b.surah || a.fromAyah - b.fromAyah
  );

  const short = (d: string) =>
    new Date(`${d}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  return (
    <ul className="divide-y divide-[var(--color-rule)] rounded-xl border border-[var(--color-rule)]">
      {sorted.map((portion) => (
        <li key={portion.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{describePortion(portion)}</span>
            <span className="text-xs text-[var(--color-ink-faint)]">
              Stage {effectiveBox(portion, ladder) + 1} · next {short(dueDate(portion, ladder))}
            </span>
          </span>
          <button
            type="button"
            aria-label={`Remove ${describePortion(portion)}`}
            onClick={() => onRemove(portion.id)}
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-[var(--color-ink-faint)] hover:bg-[var(--color-lost-soft)] hover:text-[var(--color-lost)]"
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}
