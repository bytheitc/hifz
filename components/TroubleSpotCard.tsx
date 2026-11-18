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
    <section aria-label="Trouble spot" className="card flex flex-wrap items-center gap-x-4 gap-y-3 border-l-4 border-l-[var(--color-lost)] p-4">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-lost)]">
          Keeps slipping{spot.recovered && <span className="ml-2 normal-case tracking-normal text-[var(--color-ink-faint)]">holding for now</span>}
        </p>
        <p className="mt-0.5 font-bold">{describePortion(spot.portion)}</p>
        <p className="mt-0.5 text-sm text-[var(--color-ink-soft)]">{spot.reasons.join(" · ")}</p>
      </div>
      {spot.dueToday && onJump && (
        <button type="button" onClick={onJump} className="btn btn-sm border border-[var(--color-lost)]/40 text-[var(--color-lost)] hover:bg-[var(--color-lost-soft)]">
          Go to it
        </button>
      )}
    </section>
  );
}
