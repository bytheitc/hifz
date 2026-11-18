import { type DateOnly, type Grade, type Ladder, type TrackedPortion, review } from "./srs";

/**
 * Who said a portion was solid, shaky or lost — and the record of them
 * saying it.
 *
 * Until now a grade overwrote the portion: `review()` returned a new box and
 * a new `lastReviewed`, and the previous value was gone. That is the right
 * model for exactly one setting — one student, one device, grading
 * themselves. It breaks the moment either of those stops being true:
 *
 * 1. In a madrasah the teacher hears the recitation, and the teacher's
 *    assessment is the ground truth. A student also revising at home means
 *    two people writing to the same portion, and in-place state cannot say
 *    which of them to believe.
 *
 * 2. Two devices holding in-place state cannot be merged. There is no way to
 *    tell a stale box from a newer one, so a sync would have to pick a
 *    winner and silently discard the other side's work.
 *
 * So a grade is recorded as an event and the portion's state is a fold over
 * the events. The fold step is still `review()`, unchanged — the scheduling
 * rules were never the problem. Events are append-only and carry their own
 * id, which makes merging two devices a set union rather than a judgement
 * call, and means a teacher can always answer "who marked this solid?".
 *
 * This file deliberately has no opinion about where the events are stored.
 */

/** Who recorded a grade. A student grading their own revision is `self`;
 *  there is no teacher id to invent for someone working alone. */
export type Recorder =
  | { readonly kind: "self" }
  | { readonly kind: "teacher"; readonly teacherId: string };

export interface GradeEvent {
  readonly id: string;
  readonly portionId: string;
  /** Whose trail this belongs to. Present even in the solo case, so a trail
   *  can later join a halaqah without rewriting its history. */
  readonly studentId: string;
  readonly grade: Grade;
  /** The revision day this grade belongs to, which is what scheduling uses. */
  readonly on: DateOnly;
  /** Wall-clock time of recording, ISO-8601. Only ever used to order two
   *  events that fall on the same day; never for scheduling, which is
   *  date-only on purpose (see the note in srs.ts). */
  readonly recordedAt: string;
  readonly by: Recorder;
}

export function isTeacherGrade(event: GradeEvent): boolean {
  return event.by.kind === "teacher";
}

/**
 * Order events for folding: by revision day, then by when they were recorded.
 *
 * Sorting rather than trusting arrival order matters because events arrive
 * out of order whenever anything syncs — a teacher's phone that was offline
 * all morning hands over a grade recorded hours before the one already
 * stored.
 */
export function inOrder(events: readonly GradeEvent[]): GradeEvent[] {
  return [...events].sort(
    (a, b) =>
      a.on.localeCompare(b.on) ||
      a.recordedAt.localeCompare(b.recordedAt) ||
      a.id.localeCompare(b.id)
  );
}

/**
 * The events that actually move the schedule, with the teacher's word taking
 * precedence.
 *
 * On any day where a teacher graded a portion, the student's own grade for
 * that same portion and day is kept in the log but does not affect
 * scheduling. This is what "the teacher hears the recitation" means in data:
 * a student who marks Al-Mulk solid in the morning and stumbles through it at
 * halaqah that evening ends the day on the teacher's assessment, not their
 * own.
 *
 * Note what this does NOT do. It does not discard self-grades on days the
 * teacher was not there. A student revising between sessions still advances
 * their own schedule, which is the whole point of revising between sessions,
 * and a madrasah that never records a teacher grade gets exactly the solo
 * behaviour the app has always had.
 */
export function schedulingEvents(events: readonly GradeEvent[]): GradeEvent[] {
  const teacherDays = new Set<string>();
  for (const event of events) {
    if (isTeacherGrade(event)) teacherDays.add(`${event.portionId}@${event.on}`);
  }

  return inOrder(events).filter(
    (event) =>
      isTeacherGrade(event) || !teacherDays.has(`${event.portionId}@${event.on}`)
  );
}

/**
 * Rebuild a portion's state from its grade history.
 *
 * `baseline` is the portion as it stood before the first event in the log —
 * for a newly added portion, box 0 and never reviewed. It is stored, and it
 * is never overwritten with the folded result.
 *
 * That separation is load-bearing in two directions. It is what makes the
 * same history produce the same portion on the student's phone and the
 * teacher's, because neither device folds on top of the other's answer. And
 * it is the only way a trail from before grades were recorded as events can
 * survive: those portions carry real progress — a box, a review date, a
 * count of lapses — and no event log that could reconstruct it. Their
 * baseline is simply the state they already had, with an empty log, so the
 * fold returns them untouched. An earlier version of this function reset
 * every portion to box 0 first, which was correct for determinism and would
 * have silently erased the progress of every existing user on upgrade.
 */
export function applyGrades(
  baseline: TrackedPortion,
  events: readonly GradeEvent[],
  ladder?: Ladder
): TrackedPortion {
  const mine = schedulingEvents(events).filter(
    (event) => event.portionId === baseline.id
  );

  return mine.reduce(
    (portion, event) => review(portion, event.grade, event.on, ladder),
    baseline
  );
}

/** Rebuild a whole trail. */
export function applyAllGrades(
  portions: readonly TrackedPortion[],
  events: readonly GradeEvent[],
  ladder?: Ladder
): TrackedPortion[] {
  return portions.map((portion) => applyGrades(portion, events, ladder));
}

/**
 * Merge two event logs.
 *
 * A set union keyed on event id, which is correct precisely because events
 * are never edited: the same event seen twice is the same event, and two
 * different events can both be true. This is the seam a server, a shared
 * halaqah or a second device plugs into later, and it needs no conflict
 * resolution because there are no conflicts to resolve.
 */
export function mergeEvents(
  a: readonly GradeEvent[],
  b: readonly GradeEvent[]
): GradeEvent[] {
  const byId = new Map<string, GradeEvent>();
  for (const event of [...a, ...b]) {
    if (!byId.has(event.id)) byId.set(event.id, event);
  }
  return inOrder([...byId.values()]);
}

/** The most recent grade recorded for a portion, whoever gave it. Used by the
 *  UI to show a teacher what was said last time without replaying the fold. */
export function lastGrade(
  events: readonly GradeEvent[],
  portionId: string
): GradeEvent | null {
  const mine = inOrder(events).filter((event) => event.portionId === portionId);
  return mine.length > 0 ? mine[mine.length - 1] : null;
}
