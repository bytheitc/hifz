import { ItcMark } from "@/components/ItcMark";

/**
 * The juz ring: thirty segments, one for each juz, filled as they are
 * held: an honest picture of someone's progress. It is a chart, not the logo;
 * the logo is the ITC mark.
 *
 * Segments run clockwise from the top, in the order of the mushaf.
 */
const SEGMENTS = 30;
const GAP = 1.6; // degrees left empty at each end of a segment

function arc(r: number, a0: number, a1: number) {
  const at = (a: number) => {
    const rad = ((a - 90) * Math.PI) / 180;
    return `${(50 + r * Math.cos(rad)).toFixed(2)} ${(50 + r * Math.sin(rad)).toFixed(2)}`;
  };
  return `M${at(a0)}A${r} ${r} 0 0 1 ${at(a1)}`;
}

/** The ring alone, in the current text colours. `held` is how many juz are filled. */
export function JuzRing({ held = 19, className = "size-10", label }: { held?: number; className?: string; label?: string }) {
  const filled = Math.max(0, Math.min(SEGMENTS, Math.round(held)));
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label={label ?? `${filled} of 30 juz`}>
      {Array.from({ length: SEGMENTS }, (_, i) => (
        <path
          key={i}
          d={arc(40, i * 12 + GAP, (i + 1) * 12 - GAP)}
          fill="none"
          strokeWidth={9}
          stroke={i < filled ? "var(--color-brand)" : "var(--color-rule)"}
        />
      ))}
      <circle cx="50" cy="50" r="6" fill="var(--color-dawn)" />
    </svg>
  );
}

/** The logo: the Islamic Tech Collective's mark (components/ItcMark.tsx). */
export function Mark({ className = "size-9" }: { className?: string }) {
  return <ItcMark className={className} />;
}
