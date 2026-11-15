import type { CoachLine } from "@/lib/coach";

/**
 * The coach's card. It sits at the top on a phone because it is the one
 * element that answers "what do I do right now" without the student having to
 * read a dashboard, and that is the entire question someone has when they
 * open this on a bus.
 */
export function Coach({ said }: { said: CoachLine }) {
  return (
    <section
      aria-label="Today's guidance"
      className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-card)] p-4 sm:p-5 dark:border-white/10 dark:bg-white/5"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-brand)]">
        {said.greeting}
      </p>
      <p className="mt-1.5 text-balance text-base leading-snug sm:text-lg">
        {said.line}
      </p>
      {said.nudge && (
        <p className="mt-2 text-sm text-[var(--color-ink-soft)] dark:text-white/55">
          {said.nudge}
        </p>
      )}
    </section>
  );
}
