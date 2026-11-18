import { ArrowDown } from "lucide-react";
import type { CoachLine } from "@/lib/coach";

/**
 * The day at a glance, and the coach's one sentence about it. It sits at the
 * top because it answers the only question someone has when they open this
 * on a bus: what do I do right now?
 */
export function Coach({
  said,
  dateLabel,
  dueCount,
  dueAyahs,
  done,
  onStart,
}: {
  said: CoachLine;
  dateLabel: string;
  dueCount: number;
  dueAyahs: number;
  done: number;
  onStart?: () => void;
}) {
  return (
    <section aria-label="Today" className="card overflow-hidden">
      <div className="p-5 sm:p-6">
        <p className="text-sm font-semibold text-[var(--color-ink-faint)]">{dateLabel}</p>
        <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-brand)]">{said.greeting}</p>
        <p className="mt-2 text-balance text-xl font-bold leading-snug sm:text-2xl">{said.line}</p>
        {said.nudge && <p className="mt-2 text-[15px] text-[var(--color-ink-soft)]">{said.nudge}</p>}
      </div>
      <div className="grid grid-cols-3 border-t border-[var(--color-rule)] text-center">
        <Stat value={dueCount} label={dueCount === 1 ? "portion due" : "portions due"} />
        <Stat value={dueAyahs} label="ayahs to recite" border />
        <Stat value={done} label="graded today" border />
      </div>
      {onStart && dueCount > 0 && (
        <button type="button" onClick={onStart} className="flex w-full items-center justify-center gap-2 border-t border-[var(--color-rule)] bg-[var(--color-brand)] py-3.5 text-sm font-bold text-white transition-colors hover:bg-[var(--color-brand-deep)]">
          Start today&apos;s revision <ArrowDown className="size-4" />
        </button>
      )}
    </section>
  );
}

function Stat({ value, label, border = false }: { value: number; label: string; border?: boolean }) {
  return (
    <div className={`px-2 py-4 ${border ? "border-l border-[var(--color-rule)]" : ""}`}>
      <p className="text-2xl font-extrabold tabular-nums sm:text-3xl">{value.toLocaleString()}</p>
      <p className="mt-0.5 text-xs text-[var(--color-ink-soft)]">{label}</p>
    </div>
  );
}
