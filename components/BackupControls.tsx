"use client";

import { useState } from "react";
import type { TrackedPortion } from "@/lib/srs";
import type { GradeEvent } from "@/lib/grading";
import {
  type BackupSubject,
  backupFilename,
  buildBackup,
  describeProblem,
  describeTakeIn,
  describeWrongPerson,
  readBackup,
} from "@/lib/backup";

/** What gets written out: baselines and the log that produced the screen. */
export interface TrailContents {
  readonly portions: readonly TrackedPortion[];
  readonly events: readonly GradeEvent[];
}

/** What comes back off a file, which additionally claims whose record it is. */
export interface IncomingTrail extends TrailContents {
  readonly subject: BackupSubject | null;
}

export type TakeInCounts =
  | { readonly ok: true; readonly added: number; readonly alreadyHad: number; readonly grades: number }
  | { readonly ok: false; readonly subjectName: string | null };

/**
 * Export and import, sitting next to "Clear everything" on purpose: the
 * button that can lose a trail and the one that saves it belong in the same
 * glance.
 *
 * The same two buttons do two jobs. For a student they are a backup. For a
 * teacher they are how a student's week reaches the halaqah: the student
 * saves a copy on their own phone, sends the file over, and the teacher takes
 * it in against that student's name. The wording changes because the question
 * in the person's head is different - "is my trail safe" against "what has
 * this child actually been doing" - but it is one mechanism, and no server.
 */
export function BackupControls({
  portions,
  trail,
  today,
  mode,
  subject,
  onTakeIn,
}: {
  /** The portions as shown: used for counts, not for what gets written. */
  portions: readonly TrackedPortion[];
  /** What is written: baselines plus the grade log that produced the above. */
  trail: TrailContents;
  today: string;
  mode: "solo" | "teacher";
  /** Whose record this trail is, written into the file so the far end can
   *  tell whether it belongs where it is being put. */
  subject: BackupSubject | null;
  onTakeIn: (incoming: IncomingTrail) => TakeInCounts | null;
}) {
  const [said, setSaid] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const teaching = mode === "teacher";

  function exportTrail() {
    // Baselines and the log, not the folded result. A file holding folded
    // portions beside the grades that produced them would count every grade
    // twice when it was read back in.
    const text = JSON.stringify(
      buildBackup(trail.portions, today, trail.events, subject),
      null,
      2
    );
    const url = URL.createObjectURL(
      new Blob([text], { type: "application/json" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = backupFilename(today);
    link.click();
    URL.revokeObjectURL(url);
    setFailed(false);
    const p = portions.length;
    const g = trail.events.length;
    setSaid(
      `Saved ${p} ${p === 1 ? "portion" : "portions"} and ${g} ${g === 1 ? "grade" : "grades"} to ${backupFilename(today)}.`
    );
  }

  async function importTrail(file: File) {
    const text = await file.text();
    const result = readBackup(text);

    if ("kind" in result) {
      setFailed(true);
      setSaid(describeProblem(result));
      return;
    }

    // Counted from the file itself, so the sentence can admit what was lost
    // on the way in rather than quietly rounding it off.
    const discarded = countPortions(text) - result.portions.length;
    const counts = onTakeIn({
      portions: result.portions,
      events: result.events,
      subject: result.subject,
    });
    if (!counts) {
      setFailed(true);
      setSaid("There is no trail open to read that into.");
      return;
    }
    if (!counts.ok) {
      setFailed(true);
      setSaid(describeWrongPerson(counts.subjectName));
      return;
    }

    setFailed(false);
    setSaid(describeTakeIn(counts, Math.max(0, discarded)));
  }

  return (
    <div className="mt-3 rounded-xl border border-[var(--color-rule)] p-3 dark:border-white/10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-soft)] dark:text-white/55">
        {teaching ? "Their own record" : "Backup"}
      </p>
      <p className="mt-1 text-xs text-[var(--color-ink-soft)] dark:text-white/50">
        {teaching
          ? "Take in the file a student saved on their own phone, to see what they did between sessions."
          : "This trail lives only in this browser. Keep a copy somewhere you own."}
      </p>

      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          onClick={exportTrail}
          disabled={portions.length === 0}
          className="min-h-[44px] flex-1 rounded-xl border border-[var(--color-rule)] px-3 text-sm disabled:opacity-40 dark:border-white/15 sm:min-h-0 sm:py-2"
        >
          Save a copy
        </button>

        <label className="min-h-[44px] flex-1 cursor-pointer rounded-xl border border-[var(--color-rule)] px-3 text-center text-sm leading-[44px] dark:border-white/15 sm:min-h-0 sm:py-2 sm:leading-normal">
          {teaching ? "Take in" : "Restore"}
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(event) => {
              const input = event.target;
              const file = input.files?.[0];
              if (file) void importTrail(file);
              // Cleared so picking the same file twice fires again.
              input.value = "";
            }}
          />
        </label>
      </div>

      <p
        aria-live="polite"
        className={`mt-2 min-h-[1rem] text-xs ${
          failed
            ? "text-[var(--color-lost)]"
            : "text-[var(--color-ink-soft)] dark:text-white/50"
        }`}
      >
        {said}
      </p>

      <p className="mt-1.5 text-[11px] text-[var(--color-ink-soft)] dark:text-white/40">
        {teaching
          ? "Their grades are added alongside yours. What you recorded in halaqah still stands for the days you heard them."
          : "Only adds what is missing. Grades your teacher recorded will stand for the days they heard you."}
      </p>
    </div>
  );
}

/** How many entries the file claimed, so the count of unreadable ones is
 *  honest rather than inferred. */
function countPortions(text: string): number {
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== "object" || parsed === null) return 0;
    const portions = (parsed as Record<string, unknown>).portions;
    return Array.isArray(portions) ? portions.length : 0;
  } catch {
    return 0;
  }
}
