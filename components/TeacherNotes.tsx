"use client";

import { describePortion } from "@/lib/quran";
import type { Grade, TrackedPortion } from "@/lib/srs";
import type { DateOnly } from "@/lib/srs";

export interface TeacherNote {
  readonly portion: TrackedPortion;
  readonly grade: Grade;
  readonly on: DateOnly;
}

/**
 * What the teacher said, where the student will actually see it.
 *
 * This started as a line inside the day's queue, which was wrong in the one
 * case that matters: a portion the teacher marked lost is not due again until
 * tomorrow, so the queue is empty and the feedback had nowhere to appear. The
 * student would open the app after a halaqah, find a portion quietly reset to
 * box 0, and have no way to tell an assessment from a glitch.
 *
 * So it sits on its own, above the work, and says who said it and when. A
 * grade from someone who heard you recite is a different kind of fact from
 * one you gave yourself, and the difference is worth a line of interface.
 */
export function TeacherNotes({ notes }: { notes: readonly TeacherNote[] }) {
  if (notes.length === 0) return null;

  return (
    <section
      aria-label="From your teacher"
      className="rounded-2xl border border-[var(--color-rule)] p-4 dark:border-white/10"
    >
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-soft)] dark:text-white/55">
        From your teacher
      </h2>

      <ul className="mt-2 space-y-1.5">
        {notes.map((note) => (
          <li
            key={`${note.portion.id}-${note.on}`}
            className="flex items-baseline justify-between gap-3 text-sm"
          >
            <span className="min-w-0 truncate">
              {describePortion(note.portion)}
            </span>
            <span className="shrink-0 text-xs text-[var(--color-ink-soft)] dark:text-white/50">
              <span
                style={{ color: `var(--color-${note.grade})` }}
                className="font-medium"
              >
                {note.grade}
              </span>{" "}
              · {note.on}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-2 text-xs text-[var(--color-ink-soft)] dark:text-white/50">
        Recorded by whoever heard you recite. These stand for the days they
        heard you, over anything you marked yourself.
      </p>
    </section>
  );
}
