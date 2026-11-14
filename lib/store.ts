import type { DateOnly, Grade, TrackedPortion } from "./srs";
import type { GradeEvent, Recorder } from "./grading";
import { applyAllGrades, mergeEvents } from "./grading";
import type { Halaqah, Student, StudentTrail, Teacher } from "./halaqah";
import { trailOf } from "./halaqah";
import { loadPortions } from "./storage";

/**
 * The whole of what this app keeps, and how it gets there from what the
 * previous version kept.
 *
 * Still entirely in the browser. What changed is that the browser now holds
 * more than one person's trail, because a teacher running a halaqah has
 * twenty of them, and that grades are kept as an append-only log rather than
 * written over the portion (see grading.ts for why).
 *
 * Two rules hold this together:
 *
 *   - `trails[].portions` are BASELINES. They are what a portion looked like
 *     before the log begins, and the folded result is never written back over
 *     them. Writing folded state into a baseline would make the next fold
 *     apply the same grades twice.
 *
 *   - the old single-trail key is read but never written and never deleted.
 *     Someone who updates, dislikes it and goes back to the previous version
 *     still finds their hifz where they left it. The cost is one stale key in
 *     localStorage; the alternative is a person losing a year of memorisation
 *     to a migration they did not ask for.
 */

export type Mode = "solo" | "teacher";

export interface AppState {
  readonly mode: Mode;
  readonly teacher: Teacher | null;
  readonly students: readonly Student[];
  readonly halaqat: readonly Halaqah[];
  readonly trails: readonly StudentTrail[];
  /** Whose trail is "mine" when the app is being used alone. */
  readonly selfStudentId: string;
}

const KEY = "hifz-trail:v2";
const SELF_ID = "self";

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

export function emptyState(today: DateOnly): AppState {
  return {
    mode: "solo",
    teacher: null,
    students: [{ id: SELF_ID, name: "My trail", joinedOn: today }],
    halaqat: [],
    trails: [
      { studentId: SELF_ID, subjectId: newId(), boundAccount: null, portions: [], events: [] },
    ],
    selfStudentId: SELF_ID,
  };
}

/**
 * Build the new shape from the old single trail.
 *
 * The portions come across exactly as they are, with an empty event log, and
 * become the baseline. Their box, last review date and lapse count are
 * therefore preserved precisely — the fold over an empty log is the identity.
 */
export function fromLegacy(
  portions: readonly TrackedPortion[],
  today: DateOnly
): AppState {
  const base = emptyState(today);
  return {
    ...base,
    trails: [
      { ...base.trails[0], studentId: SELF_ID, portions: [...portions], events: [] },
    ],
  };
}

export function loadState(today: DateOnly): AppState {
  if (typeof window === "undefined") return emptyState(today);

  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = parseState(JSON.parse(raw) as unknown);
      if (parsed) return parsed;
    }
  } catch {
    // Unreadable or corrupt. Fall through to the legacy trail rather than
    // handing the person an empty app.
  }

  const legacy = loadPortions();
  return legacy.length > 0 ? fromLegacy(legacy, today) : emptyState(today);
}

export function saveState(state: AppState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ version: 2, ...state }));
  } catch {
    // Quota, or a disabled store. Losing the write is survivable; the session
    // in memory carries on.
  }
}

/** The student's portions as they stand today: baselines with the log applied. */
export function currentPortions(
  state: AppState,
  studentId: string
): TrackedPortion[] {
  const trail = trailOf(state.trails, studentId);
  return applyAllGrades(trail.portions, trail.events);
}

function putTrail(state: AppState, trail: StudentTrail): AppState {
  const exists = state.trails.some((t) => t.studentId === trail.studentId);
  return {
    ...state,
    trails: exists
      ? state.trails.map((t) => (t.studentId === trail.studentId ? trail : t))
      : [...state.trails, trail],
  };
}

export function recordGrade(
  state: AppState,
  studentId: string,
  portionId: string,
  grade: Grade,
  on: DateOnly,
  by: Recorder
): AppState {
  const trail = trailOf(state.trails, studentId);
  const event: GradeEvent = {
    id: newId(),
    portionId,
    studentId,
    grade,
    on,
    recordedAt: new Date().toISOString(),
    by,
  };

  return putTrail(state, { ...trail, events: [...trail.events, event] });
}

/**
 * Take back the last grade recorded for a portion.
 *
 * It removes the event rather than appending a correcting one. A mis-tap two
 * seconds ago is not a fact about the student's recall, and a teacher
 * reviewing the log later should not have to read around it. Anything older
 * stays: this undoes a slip, it does not rewrite history.
 */
export function undoLastGrade(
  state: AppState,
  studentId: string,
  portionId: string
): AppState {
  const trail = trailOf(state.trails, studentId);
  let lastIndex = -1;
  trail.events.forEach((event, i) => {
    if (event.portionId === portionId) lastIndex = i;
  });
  if (lastIndex === -1) return state;

  return putTrail(state, {
    ...trail,
    events: trail.events.filter((_, i) => i !== lastIndex),
  });
}

export function addPortion(
  state: AppState,
  studentId: string,
  portion: TrackedPortion
): AppState {
  const trail = trailOf(state.trails, studentId);
  return putTrail(state, { ...trail, portions: [...trail.portions, portion] });
}

/**
 * Remove a portion, and the grades recorded against it.
 *
 * The events go because they describe a portion that no longer exists; left
 * behind they would re-attach themselves to any future portion that happened
 * to be minted with the same id.
 */
export function removePortion(
  state: AppState,
  studentId: string,
  portionId: string
): AppState {
  const trail = trailOf(state.trails, studentId);
  return putTrail(state, {
    ...trail,
    portions: trail.portions.filter((p) => p.id !== portionId),
    events: trail.events.filter((e) => e.portionId !== portionId),
  });
}

/**
 * Replace a student's trail with portions restored from a backup file.
 *
 * The restored portions arrive carrying their progress, exactly as the file
 * stored it, so they become baselines with no log — the same reasoning as the
 * legacy migration above.
 */
export function replacePortions(
  state: AppState,
  studentId: string,
  portions: readonly TrackedPortion[]
): AppState {
  const trail = trailOf(state.trails, studentId);
  const kept = new Set(portions.map((p) => p.id));
  return putTrail(state, {
    ...trail,
    portions: [...portions],
    events: trail.events.filter((e) => kept.has(e.portionId)),
  });
}

/**
 * Take on the portions a restore brought in, and only those.
 *
 * `mergeBackup` hands back the whole trail: the portions already here, with
 * their progress folded in, followed by the new ones. Storing that result as
 * baselines would be a quiet disaster — the existing portions would keep
 * their grade history AND carry its effect in their baseline, so every grade
 * would count twice and boxes would run away on the next fold. So only
 * genuinely new ids are added, and everything already here is left exactly as
 * it stands.
 */
export function addNewPortions(
  state: AppState,
  studentId: string,
  portions: readonly TrackedPortion[]
): AppState {
  const trail = trailOf(state.trails, studentId);
  const known = new Set(trail.portions.map((p) => p.id));
  const added = portions.filter((p) => !known.has(p.id));
  if (added.length === 0) return state;

  return putTrail(state, {
    ...trail,
    portions: [...trail.portions, ...added],
  });
}

/** What a portion *is*, for matching across devices. Not the id: see the
 *  note on the same function in backup.ts. */
function identity(portion: {
  surah: number;
  fromAyah: number;
  toAyah: number;
}): string {
  return `${portion.surah}:${portion.fromAyah}:${portion.toAyah}`;
}

export interface TakeInResult {
  readonly ok: true;
  readonly state: AppState;
  readonly added: number;
  readonly alreadyHad: number;
  readonly grades: number;
}

/** Refused because the file describes a different person's hifz. */
export interface TakeInRefused {
  readonly ok: false;
  readonly reason: "different-person";
  readonly subjectName: string | null;
}

export type TakeInOutcome = TakeInResult | TakeInRefused;

/**
 * Take in a trail exported from another device - a student handing their file
 * to their teacher.
 *
 * The hard part is not the merge, it is that the two devices disagree about
 * what things are called. A student's phone minted its own ids for its own
 * portions; the teacher's copy of the same Al-Mulk 1-30 has a different one.
 * So portions are matched by range, and every incoming grade is re-pointed at
 * whatever the teacher's device calls that portion. Matching by id instead
 * would give the teacher a second copy of everything the student owns, and
 * the grades would pile onto the duplicates while the originals sat still.
 *
 * Matching claims: one existing portion can absorb at most one incoming
 * portion. A student who tracks An-Nas three times has three records, and
 * collapsing them into the teacher's single one would lose two of them - the
 * same mistake that once made a seven-portion backup restore as five.
 *
 * Events keep their own ids, which are unique to the device that recorded
 * them, so taking the same file in twice adds nothing the second time.
 * Grades the teacher recorded in halaqah are never touched: the union keeps
 * both sides, and the teacher's word still wins for any day they graded.
 */
export function takeInTrail(
  state: AppState,
  studentId: string,
  incoming: {
    portions: readonly TrackedPortion[];
    events: readonly GradeEvent[];
    subject?: { id: string; name: string | null } | null;
  }
): TakeInOutcome {
  const trail = trailOf(state.trails, studentId);

  // Files move between people now - a student sends theirs to a teacher, a
  // teacher sends one back - so the wrong file in the wrong trail is a real
  // mistake with no undo. Merging someone else's hifz into your own would be
  // close to unpickable afterwards, so it is refused rather than reported.
  const incomingSubject = incoming.subject?.id ?? null;
  if (
    incomingSubject !== null &&
    trail.subjectId !== null &&
    incomingSubject !== trail.subjectId
  ) {
    return {
      ok: false,
      reason: "different-person",
      subjectName: incoming.subject?.name ?? null,
    };
  }

  const unclaimed = new Map<string, string[]>();
  for (const portion of trail.portions) {
    const key = identity(portion);
    const queue = unclaimed.get(key);
    if (queue) queue.push(portion.id);
    else unclaimed.set(key, [portion.id]);
  }

  const usedIds = new Set(trail.portions.map((p) => p.id));
  const remap = new Map<string, string>();
  const adopted: TrackedPortion[] = [];
  let alreadyHad = 0;

  for (const portion of incoming.portions) {
    const queue = unclaimed.get(identity(portion));
    const claimed = queue?.shift();
    if (claimed !== undefined) {
      remap.set(portion.id, claimed);
      alreadyHad += 1;
      continue;
    }

    let id = portion.id;
    while (usedIds.has(id)) id = `${id}-${usedIds.size}`;
    usedIds.add(id);
    remap.set(portion.id, id);
    adopted.push(id === portion.id ? portion : { ...portion, id });
  }

  const rehomed = incoming.events
    .filter((event) => remap.has(event.portionId))
    .map((event) => ({
      ...event,
      portionId: remap.get(event.portionId) as string,
      studentId,
    }));

  const events = mergeEvents(trail.events, rehomed);

  return {
    ok: true,
    state: putTrail(state, {
      studentId,
      // A trail that did not know whose it was learns it here: a teacher's
      // register entry becomes that student's record the first time their
      // own file arrives.
      subjectId: trail.subjectId ?? incomingSubject,
      boundAccount: trail.boundAccount,
      portions: [...trail.portions, ...adopted],
      events,
    }),
    added: adopted.length,
    alreadyHad,
    grades: events.length - trail.events.length,
  };
}

export type BindOutcome =
  | { readonly ok: true; readonly state: AppState }
  | { readonly ok: false; readonly reason: "other-account" };

/**
 * Tie this device's own trail to a signed-in account.
 *
 * Needed before the first sync and not merely bookkeeping: the trail's
 * subject id was minted on this device and the account's was minted at
 * registration, so for the same person they always differ. Without binding,
 * the provenance guard would read the first sync as somebody else's hifz and
 * refuse it - correctly, on the evidence it had.
 *
 * Signing a different account into a device that already holds a bound trail
 * is refused rather than merged. Two people's hifz in one record cannot be
 * taken apart again afterwards.
 */
export function bindAccount(
  state: AppState,
  accountSubjectId: string
): BindOutcome {
  const trail = trailOf(state.trails, state.selfStudentId);

  if (trail.boundAccount !== null && trail.boundAccount !== accountSubjectId) {
    return { ok: false, reason: "other-account" };
  }

  if (trail.boundAccount === accountSubjectId) return { ok: true, state };

  return {
    ok: true,
    state: putTrail(state, {
      ...trail,
      subjectId: accountSubjectId,
      boundAccount: accountSubjectId,
    }),
  };
}

export function addStudent(
  state: AppState,
  name: string,
  today: DateOnly
): { state: AppState; student: Student } {
  const student: Student = { id: newId(), name: name.trim(), joinedOn: today };
  return {
    state: {
      ...state,
      students: [...state.students, student],
      trails: [
        ...state.trails,
        {
          studentId: student.id,
          subjectId: null,
          boundAccount: null,
          portions: [],
          events: [],
        },
      ],
    },
    student,
  };
}

/** Fold another device's log for one student into this one. The seam a
 *  server or a shared circle plugs into; see mergeEvents in grading.ts. */
export function mergeTrail(state: AppState, incoming: StudentTrail): AppState {
  const mine = trailOf(state.trails, incoming.studentId);
  const known = new Set(mine.portions.map((p) => p.id));

  return putTrail(state, {
    studentId: incoming.studentId,
    subjectId: mine.subjectId ?? incoming.subjectId,
    boundAccount: mine.boundAccount ?? incoming.boundAccount,
    portions: [
      ...mine.portions,
      ...incoming.portions.filter((p) => !known.has(p.id)),
    ],
    events: mergeEvents(mine.events, incoming.events),
  });
}

function parseState(value: unknown): AppState | null {
  if (typeof value !== "object" || value === null) return null;
  const c = value as Record<string, unknown>;
  if (!Array.isArray(c.trails) || !Array.isArray(c.students)) return null;

  return {
    mode: c.mode === "teacher" ? "teacher" : "solo",
    teacher: (c.teacher as Teacher | null) ?? null,
    students: c.students as Student[],
    halaqat: Array.isArray(c.halaqat) ? (c.halaqat as Halaqah[]) : [],
    trails: (c.trails as StudentTrail[]).map((trail) => ({
      studentId: String(trail.studentId),
      subjectId: typeof trail.subjectId === "string" ? trail.subjectId : null,
      boundAccount:
        typeof trail.boundAccount === "string" ? trail.boundAccount : null,
      portions: Array.isArray(trail.portions) ? trail.portions : [],
      events: Array.isArray(trail.events) ? trail.events : [],
    })),
    selfStudentId:
      typeof c.selfStudentId === "string" ? c.selfStudentId : SELF_ID,
  };
}
