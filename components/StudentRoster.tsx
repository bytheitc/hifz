"use client";

import { useState } from "react";
import type { Student } from "@/lib/halaqah";

/**
 * The register, as a teacher actually uses it: a strip of names across the
 * top with the number of portions each student owes today.
 *
 * It is a horizontal scroller rather than a list because the teacher is
 * holding a phone in a circle of students and moving between them constantly;
 * a vertical list would push the student's actual queue below the fold, which
 * is the thing they need to see while someone is reciting to them.
 *
 * The due count is on the name for one reason: it is how a teacher decides
 * who to hear next when the session is going to run out of time before it
 * runs out of students.
 */
export function StudentRoster({
  students,
  activeId,
  dueCounts,
  onSelect,
  onAdd,
}: {
  students: readonly Student[];
  activeId: string;
  dueCounts: Readonly<Record<string, number>>;
  onSelect: (id: string) => void;
  onAdd: (name: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed === "") return;
    onAdd(trimmed);
    setName("");
    setAdding(false);
  }

  return (
    <section aria-label="Students">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-soft)] dark:text-white/55">
          Halaqah{students.length > 0 && ` · ${students.length}`}
        </h2>
        <button
          type="button"
          onClick={() => setAdding((open) => !open)}
          className="rounded-lg border border-[var(--color-rule)] px-2.5 py-1 text-[11px] text-[var(--color-ink-soft)] dark:border-white/15 dark:text-white/55"
        >
          {adding ? "Cancel" : "Add student"}
        </button>
      </div>

      {adding && (
        <form onSubmit={submit} className="mb-2.5 flex gap-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Name"
            aria-label="Student name"
            autoFocus
            className="min-h-11 flex-1 rounded-xl border border-[var(--color-rule)] bg-transparent px-3 text-base dark:border-white/15"
          />
          <button
            type="submit"
            className="min-h-11 shrink-0 rounded-xl bg-[var(--color-brand)] px-4 text-sm font-medium text-white active:opacity-80"
          >
            Add
          </button>
        </form>
      )}

      {students.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--color-rule)] p-5 text-sm text-[var(--color-ink-soft)] dark:border-white/15 dark:text-white/55">
          No students yet. Add the people you hear each week.
        </p>
      ) : (
        // -mx-4 px-4 lets the strip bleed to the screen edge on a phone, so
        // the last name does not look like the end of the list when it is not.
        <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {students.map((student) => {
            const due = dueCounts[student.id] ?? 0;
            const active = student.id === activeId;
            return (
              <li key={student.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => onSelect(student.id)}
                  aria-current={active ? "true" : undefined}
                  className={`min-h-11 rounded-xl border px-3 py-1.5 text-left text-sm ${
                    active
                      ? "border-[var(--color-brand)] bg-[var(--color-brand)] text-white"
                      : "border-[var(--color-rule)] dark:border-white/15"
                  }`}
                >
                  <span className="block max-w-[10rem] truncate font-medium">
                    {student.name}
                  </span>
                  <span
                    className={`block text-[11px] ${
                      active
                        ? "text-white/75"
                        : "text-[var(--color-ink-soft)] dark:text-white/50"
                    }`}
                  >
                    {due === 0 ? "nothing due" : `${due} due`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
