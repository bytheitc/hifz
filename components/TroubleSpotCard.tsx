import { describePortion } from "@/lib/quran";
import type { TroubleSpot } from "@/lib/trouble";

/**
 * The portion that keeps going.
 *
 * The app already knew this - `lapses` has been tracked since the first
 * commit - but it was reported at the bottom of the page as a flat list of
 * anything past three lapses, which is the right alarm in the wrong place and
 * without a ranking. On a phone it was below four other sections and was
 * never seen by the person it was written for.
 */
export function TroubleSpotCard({
  spot,
  onJump,
}: {
  spot: TroubleSpot;
  onJump?: () => void;
}) {
  return (
    <section
      aria-label="Trouble spot"
      className="rounded-2xl border border-[var(--color-lost)]/35 bg-[var(--color-lost)]/[0.06] p-4 sm:p-5"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-lost)]">
          Keeps slipping
        </h2>
        {spot.recovered && (
          <span className="text-[11px] text-[var(--color-ink-soft)] dark:text-white/55">
            holding for now
          </span>
        )}
      </div>

      <p className="mt-1.5 text-lg font-medium">{describePortion(spot.portion)}</p>

      <ul className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs text-[var(--color-ink-soft)] dark:text-white/55">
        {spot.reasons.map((reason) => (
          <li
            key={reason}
            className="after:ml-2 after:text-[var(--color-ink-soft)]/50 after:content-['\00b7'] last:after:content-none"
          >
            {reason}
          </li>
        ))}
      </ul>

      {spot.dueToday && onJump && (
        <button
          type="button"
          onClick={onJump}
          className="mt-3 min-h-11 w-full rounded-xl bg-[var(--color-lost)] px-4 text-sm font-medium text-white active:opacity-80 sm:w-auto"
        >
          Go to it
        </button>
      )}
    </section>
  );
}
