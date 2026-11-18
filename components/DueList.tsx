"use client";

import { describePortion, surah } from "@/lib/quran";
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
    <ul className="space-y-3">
      {portions.map((portion) => {
        const overdue = daysBetween(dueDate(portion), today);
        const trouble = troubleIds.has(portion.id);
        const fromTeacher = teacherSaid.get(portion.id);

        return (
          <li
            key={portion.id}
            id={`portion-${portion.id}`}
            className={`scroll-mt-24 rounded-3xl border-[3px] bg-[var(--color-card)] p-4 ${
              trouble ? "border-[var(--color-lost)]/50" : "border-[var(--color-rule)]"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                  <span className="text-lg font-black">{describePortion(portion)}</span>
                  <span lang="ar" dir="rtl" className="font-quran text-2xl leading-none text-[var(--color-sky)]">
                    {surah(portion.surah)?.arabicName}
                  </span>
                </p>
                <p className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
                  <span className="rounded-md bg-[var(--color-wash)] px-2 py-0.5 text-[var(--color-ink-soft)]">
                    {portion.toAyah - portion.fromAyah + 1} ayahs
                  </span>
                  <span className="rounded-md bg-[var(--color-wash)] px-2 py-0.5 text-[var(--color-ink-soft)]">
                    {portion.lastReviewed ? `last recited ${portion.lastReviewed}` : "new, not revised yet"}
                  </span>
                  {overdue > 0 && (
                    <span className="rounded-md bg-[var(--color-shaky-soft)] px-2 py-0.5 font-semibold text-[var(--color-shaky)]">
                      {overdue} day{overdue === 1 ? "" : "s"} overdue
                    </span>
                  )}
                  {portion.lapses > 0 && (
                    <span className="rounded-md bg-[var(--color-wash)] px-2 py-0.5 text-[var(--color-ink-soft)]">
                      lost {portion.lapses} time{portion.lapses === 1 ? "" : "s"}
                    </span>
                  )}
                </p>
              </div>
              {trouble && (
                <span className="shrink-0 rounded-full bg-[var(--color-lost-soft)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[var(--color-lost)]">
                  Slipping
                </span>
              )}
            </div>

            {fromTeacher && (
              // Said plainly, and attributed: a box moved by someone who heard
              // you recite is a different event from one you moved yourself.
              <p className="mt-3 rounded-xl bg-[var(--color-wash)] px-3 py-2 text-xs text-[var(--color-ink-soft)]">
                Your teacher marked this{" "}
                <span style={{ color: `var(--color-${fromTeacher.grade})` }} className="font-bold">
                  {fromTeacher.grade}
                </span>{" "}
                on {fromTeacher.on}.
              </p>
            )}

            <div className="mt-4 grid grid-cols-3 gap-2.5 pb-1">
              {GRADES.map((grade) => (
                <button
                  key={grade.value}
                  type="button"
                  onClick={() => onGrade(portion, grade.value)}
                  className={`grade-btn grade-${grade.value}`}
                  aria-label={`${grade.label}: ${describePortion(portion)}`}
                >
                  {grade.label}
                  <span className="ml-1.5 hidden text-[11px] opacity-60 sm:inline">{grade.hint}</span>
                </button>
              ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
