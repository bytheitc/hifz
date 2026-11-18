import { checkPortion } from "./quran";
import { MAX_STAGES, type DateOnly, type TrackedPortion } from "./srs";
import type { GradeEvent } from "./grading";

/**
 * Carrying a trail between devices.
 *
 * `localStorage` is the right home for this data and the wrong place to keep
 * the only copy of it. A cleared browser takes years of records with it, and
 * the loss is worse than it looks: the trouble-spot ranking reads `lapses`
 * accumulated over months, so a student who loses their storage does not just
 * lose their schedule, they lose the history that made the app worth more
 * than a notebook. A file the person holds is the whole backup story here -
 * no account, no server, nothing to breach.
 */

export const BACKUP_FORMAT = "hifz-trail-backup";

/**
 * Version 2 carries the grade log as well as the portions.
 *
 * Version 1 held only portions with their progress baked in, which is enough
 * to restore your own trail and not enough to hand to a teacher: it says
 * where the student got to but not what happened on the way, so the teacher
 * could not tell a portion revised steadily from one rescued twice from
 * zero. It also could not merge - two logs union cleanly, two snapshots do
 * not.
 *
 * A version 1 file still reads, as a trail whose history simply is not known.
 */
export const BACKUP_VERSION = 2;

/** Whose hifz the file describes. Optional, because version 1 files and the
 *  first version 2 files carry none, and a file with no claim about its
 *  subject is taken at face value. */
export interface BackupSubject {
  readonly id: string;
  readonly name: string | null;
}

export interface Backup {
  readonly format: string;
  readonly version: number;
  readonly exportedOn: DateOnly;
  /** Baselines: the portions as they stood before the log begins. */
  readonly portions: readonly TrackedPortion[];
  readonly events: readonly GradeEvent[];
  readonly subject: BackupSubject | null;
}

export function buildBackup(
  portions: readonly TrackedPortion[],
  today: DateOnly,
  events: readonly GradeEvent[] = [],
  subject: BackupSubject | null = null
): Backup {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedOn: today,
    portions: [...portions],
    events: [...events],
    subject,
  };
}

/** Dated, because the first thing anyone does with two backups is ask which
 *  one is newer, and a filename answers that without opening either. */
export function backupFilename(today: DateOnly): string {
  return `hifz-trail-${today}.json`;
}

export type BackupProblem =
  | { kind: "not-json" }
  | { kind: "not-a-backup" }
  | { kind: "newer-version"; version: number };

/**
 * Parse a file someone chose. Returns the problem rather than throwing, for
 * the same reason `checkPortion` does: the caller is a UI that needs a
 * sentence, not a stack trace.
 *
 * The envelope is checked before anything else. Someone will eventually pick
 * the wrong file from their downloads folder, and "that file is not a Hifz
 * Trail backup" has to be the outcome rather than a half-read import.
 */
export function readBackup(text: string): Backup | BackupProblem {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { kind: "not-json" };
  }

  if (typeof parsed !== "object" || parsed === null) return { kind: "not-a-backup" };
  const envelope = parsed as Record<string, unknown>;
  if (envelope.format !== BACKUP_FORMAT) return { kind: "not-a-backup" };
  if (!Array.isArray(envelope.portions)) return { kind: "not-a-backup" };

  const version = typeof envelope.version === "number" ? envelope.version : 0;
  // A file from a later version of the app may hold fields this build would
  // silently drop on the next save. Refusing is kinder than quietly
  // truncating someone's record.
  if (version > BACKUP_VERSION) return { kind: "newer-version", version };

  const portions = envelope.portions.filter(isUsablePortion);
  const known = new Set(portions.map((p) => p.id));

  return {
    format: BACKUP_FORMAT,
    version,
    exportedOn:
      typeof envelope.exportedOn === "string" ? envelope.exportedOn : "",
    portions,
    // A grade for a portion that did not survive validation describes
    // something no longer in the file, so it is dropped with it rather than
    // left to attach itself to whatever later takes that id.
    events: Array.isArray(envelope.events)
      ? envelope.events.filter(isUsableEvent).filter((e) => known.has(e.portionId))
      : [],
    subject: readSubject(envelope.subject),
  };
}

function readSubject(value: unknown): BackupSubject | null {
  if (typeof value !== "object" || value === null) return null;
  const c = value as Record<string, unknown>;
  if (typeof c.id !== "string" || c.id === "") return null;
  return { id: c.id, name: typeof c.name === "string" ? c.name : null };
}

function isUsableEvent(value: unknown): value is GradeEvent {
  if (typeof value !== "object" || value === null) return false;
  const c = value as Record<string, unknown>;

  if (typeof c.id !== "string" || c.id === "") return false;
  if (typeof c.portionId !== "string" || c.portionId === "") return false;
  if (typeof c.studentId !== "string") return false;
  if (c.grade !== "solid" && c.grade !== "shaky" && c.grade !== "lost") return false;
  if (typeof c.on !== "string" || !isDateOnly(c.on)) return false;
  if (typeof c.recordedAt !== "string") return false;

  const by = c.by as Record<string, unknown> | null;
  if (typeof by !== "object" || by === null) return false;
  if (by.kind === "self") return true;
  return by.kind === "teacher" && typeof by.teacherId === "string";
}

/**
 * A portion has to survive a round trip through a file someone may have
 * edited, synced through a service that mangles it, or produced with an older
 * build. Anything that would render as nonsense is dropped rather than shown.
 */
function isUsablePortion(value: unknown): value is TrackedPortion {
  if (typeof value !== "object" || value === null) return false;
  const c = value as Record<string, unknown>;

  if (typeof c.id !== "string" || c.id === "") return false;
  if (typeof c.surah !== "number") return false;
  if (typeof c.fromAyah !== "number") return false;
  if (typeof c.toAyah !== "number") return false;
  if (typeof c.box !== "number") return false;
  if (typeof c.lapses !== "number") return false;
  if (typeof c.addedOn !== "string") return false;
  if (c.lastReviewed !== null && typeof c.lastReviewed !== "string") return false;

  // The same check the add-portion form uses, so an imported portion can
  // never be one the app would have refused to create.
  if (checkPortion(c.surah, c.fromAyah, c.toAyah) !== null) return false;

  if (!Number.isInteger(c.box) || c.box < 0 || c.box >= MAX_STAGES) return false;
  if (!Number.isInteger(c.lapses) || c.lapses < 0) return false;
  if (!isDateOnly(c.addedOn)) return false;
  if (c.lastReviewed !== null && !isDateOnly(c.lastReviewed as string)) return false;

  return true;
}

function isDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

/**
 * What a portion *is*, for the purpose of "do I already have this?".
 *
 * Not the id. Ids are generated on the device that created the portion, so
 * the same Al-Mulk 1-30 memorised on a phone and exported to a laptop carries
 * two different ids. Merging by id would hand the student a duplicate of
 * every portion they own, which is the one outcome that would make them stop
 * using import.
 */
function identity(portion: {
  surah: number;
  fromAyah: number;
  toAyah: number;
}): string {
  return `${portion.surah}:${portion.fromAyah}:${portion.toAyah}`;
}

export interface MergeResult {
  readonly portions: TrackedPortion[];
  readonly added: number;
  readonly alreadyHad: number;
}

/**
 * Merge an imported trail into the current one.
 *
 * Import only ever adds. A portion already in the trail is left exactly as it
 * is, even when the file holds a different box or a later review date. That
 * rule costs something real - restoring a newer backup over an older trail
 * will not advance the portions you already have - and it buys the guarantee
 * that matters more: choosing the wrong file can never undo revision work.
 * The person reaching for import has usually just lost data, and a merge that
 * can also destroy it is not a backup feature.
 *
 * Incoming portions are weighed against the current trail only, never against
 * each other. The add form lets a student track the same range twice -
 * deliberately or not - so a file holding it twice is a faithful record of
 * their trail, and restoring it into an empty app has to give back exactly
 * what was saved. A backup that quietly returns fewer portions than it stored
 * is not one.
 */
export function mergeBackup(
  current: readonly TrackedPortion[],
  incoming: readonly TrackedPortion[]
): MergeResult {
  const alreadyTracked = new Set(current.map(identity));
  const usedIds = new Set(current.map((p) => p.id));
  const added: TrackedPortion[] = [];

  for (const portion of incoming) {
    if (alreadyTracked.has(identity(portion))) continue;

    // Two devices can mint the same id, and a duplicate React key would make
    // rows disappear. The record is kept; only its local handle changes.
    let id = portion.id;
    while (usedIds.has(id)) id = `${id}-${usedIds.size}`;
    usedIds.add(id);

    added.push(id === portion.id ? portion : { ...portion, id });
  }

  return {
    portions: [...current, ...added],
    added: added.length,
    alreadyHad: incoming.length - added.length,
  };
}

export function describeProblem(problem: BackupProblem): string {
  switch (problem.kind) {
    case "not-json":
      return "That file could not be read. A backup is a .json file saved from this app.";
    case "not-a-backup":
      return "That is not a Hifz Trail backup. Nothing was changed.";
    case "newer-version":
      return "That backup came from a newer version of the app. Update first, so nothing is lost.";
  }
}

/** Said after a merge. Counts, because the question in the person's head is
 *  "did it work", and a number answers it where "Imported" does not. */
export function describeMerge(result: MergeResult, discarded: number): string {
  const parts: string[] = [];
  parts.push(
    result.added === 0
      ? "Added nothing new"
      : `Added ${result.added} ${result.added === 1 ? "portion" : "portions"}`
  );
  if (result.alreadyHad > 0) {
    parts.push(`${result.alreadyHad} already in your trail`);
  }
  if (discarded > 0) {
    parts.push(`${discarded} unreadable and skipped`);
  }
  return `${parts.join(" · ")}.`;
}

/** Said after a teacher takes in a student's file. The grade count is the
 *  part they care about: it is the difference between a name on a register
 *  and a record of what that student has actually been doing. */
export function describeTakeIn(
  result: { added: number; alreadyHad: number; grades: number },
  discarded: number
): string {
  const parts: string[] = [];
  parts.push(
    result.added === 0
      ? "Added nothing new"
      : `Added ${result.added} ${result.added === 1 ? "portion" : "portions"}`
  );
  if (result.alreadyHad > 0) parts.push(`${result.alreadyHad} already tracked`);
  parts.push(
    result.grades === 0
      ? "no new grades"
      : `${result.grades} new ${result.grades === 1 ? "grade" : "grades"}`
  );
  if (discarded > 0) parts.push(`${discarded} unreadable and skipped`);
  return `${parts.join(" · ")}.`;
}

/** Said when a file turns out to be someone else's record. Naming the person
 *  matters: the usual cause is two files in the same folder, and the name is
 *  what tells you which one you meant. */
export function describeWrongPerson(name: string | null): string {
  return name === null
    ? "That file is someone else's record. Nothing was changed."
    : `That file is ${name}'s record, not this one. Nothing was changed.`;
}
