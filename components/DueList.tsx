"use client";

import { describePortion } from "@/lib/quran";
import { type Grade, type TrackedPortion, daysBetween, dueDate } from "@/lib/srs";
import type { DateOnly } from "@/lib/srs";

const GRADES: readonly { value: Grade; label: string; hint: string; colour: string }[] = [
  { value: "solid", label: "Solid", hint: "1", colour: "var(--color-solid)" },
  { value: "shaky", label: "Shaky", hint: "2", colour: "var(--color-shaky)" },
  { value: "lost", label: "Lost", hint: "3", colour: "var(--color-lost)" },
];

/**
 * The day's queue.
 *
 * Two things here are for the phone specifically. The grade buttons are a
 * full-width row at least 44px tall, because the previous ones were 24px of
 * text padding and grading twenty portions with a thumb meant missing a few,
 * and a mis-tapped "lost" costs a real portion a real reset. And the portion
 * that keeps slipping is marked in place rather than only in its own card, so
 * a student scrolling the list knows which one to slow down for without
 * having to remember what they read at the top.
 */
export function DueList({
  portions,
  today,
  troubleIds,
  teacherSaid,
  onGrade,
}: {
  portions: readonly TrackedPortion[];
  today: DateOnly;
  troubleIds: ReadonlySet<string>;
  /** What the teacher last said about a portion, when the student has taken
   *  in a file from them. Empty in the teacher's own view. */
  teacherSaid: ReadonlyMap<string, { grade: Grade; on: DateOnly }>;
  onGrade: (portion: TrackedPortion, grade: Grade) => void;
}) {
  return (
    <ul className="space-y-2.5">
      {portions.map((portion) => {
        const overdue = daysBetween(dueDate(portion), today);
        const trouble = troubleIds.has(portion.id);
        const fromTeacher = teacherSaid.get(portion.id);

        return (
          <li
            key={portion.id}
            id={`portion-${portion.id}`}
            className={`scroll-mt-4 rounded-2xl border bg-[var(--color-card)] p-3.5 dark:bg-white/5 ${
              trouble
                ? "border-[var(--color-lost)]/40"
                : "border-[var(--color-rule)] dark:border-white/10"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-medium">
                  {describePortion(portion)}
                </p>
                <p className="mt-0.5 text-xs text-[var(--color-ink-soft)] dark:text-white/55">
                  {portion.lastReviewed
                    ? `last recited ${portion.lastReviewed}`
                    : "new, not yet revised"}
                  {overdue > 0 && ` · ${overdue} day${overdue === 1 ? "" : "s"} overdue`}
                  {portion.lapses > 0 &&
                    ` · ${portion.lapses} lapse${portion.lapses === 1 ? "" : "s"}`}
                </p>
              </div>
              {trouble && (
                <span className="shrink-0 rounded-full bg-[var(--color-lost)]/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-lost)]">
                  slipping
                </span>
              )}
            </div>

            {fromTeacher && (
              // Said plainly, and attributed. A box that moved because
              // someone heard you recite is not the same event as a box that
              // moved because you graded yourself, and the student is owed
              // the difference.
              <p className="mt-2 rounded-lg bg-black/[0.03] px-2.5 py-1.5 text-xs text-[var(--color-ink-soft)] dark:bg-white/5 dark:text-white/60">
                Your teacher marked this{" "}
                <span
                  style={{ color: `var(--color-${fromTeacher.grade})` }}
                  className="font-medium"
                >
                  {fromTeacher.grade}
                </span>{" "}
                on {fromTeacher.on}.
              </p>
            )}

            <div className="mt-3 grid grid-cols-3 gap-2">
              {GRADES.map((grade) => (
                <button
                  key={grade.value}
                  type="button"
                  onClick={() => onGrade(portion, grade.value)}
                  style={{ backgroundColor: grade.colour }}
                  className="min-h-11 rounded-xl text-sm font-medium text-white transition-opacity active:opacity-75"
                  aria-label={`${grade.label}: ${describePortion(portion)}`}
                >
                  {grade.label}
                  <span className="ml-1.5 hidden text-[10px] opacity-60 sm:inline">
                    {grade.hint}
                  </span>
                </button>
              ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
