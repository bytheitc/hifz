import type { TrackedPortion } from "./srs";
import type { GradeEvent } from "./grading";

/**
 * Students, teachers and the circle they sit in.
 *
 * The app began as one person's trail on one device, and that has to keep
 * working untouched: most people memorising Qur'an are not enrolled anywhere,
 * and a solo student should never meet the word "halaqah" in the interface.
 * So every structure here is optional. A trail with no student record, no
 * teacher and no circle is the original app, and the code paths are the same
 * ones.
 *
 * The shapes this has to leave reachable, without a rewrite:
 *
 *   - teacher-on-one-device: a teacher holds their students' trails locally
 *     and grades during halaqah. No server, no accounts.
 *   - student-owned, shared: the student keeps the record and lets a teacher
 *     see it.
 *   - madrasah: an institution holds enrolments across many circles.
 *
 * What makes all three reachable is that identity is just an id and a name,
 * minted locally, and that progress lives in the append-only grade log rather
 * than in a row some server owns. A local student id becomes a server-backed
 * one by being recorded somewhere else as well; nothing about the trail has
 * to change.
 *
 * On what is stored about a person: a display name and nothing else. Most
 * hifz students are children, the data says how well a named child is doing
 * at a religious obligation, and every additional field is a thing to leak.
 * A teacher who needs a date of birth or a guardian's number already has a
 * register; this is not one.
 */

export interface Student {
  readonly id: string;
  /** What the teacher calls them. Not a legal name, not an identifier. */
  readonly name: string;
  readonly joinedOn: string;
}

export interface Teacher {
  readonly id: string;
  readonly name: string;
}

export interface Halaqah {
  readonly id: string;
  readonly name: string;
  /** Absent when a circle is kept by a student rather than run by a teacher. */
  readonly teacherId: string | null;
  readonly studentIds: readonly string[];
}

/** One student's whole record: what they are memorising and every grade ever
 *  recorded on it. The unit that moves between devices, exports to a file, or
 *  sits in a row on a server. */
export interface StudentTrail {
  readonly studentId: string;
  /**
   * Whose hifz this actually is, as a stable id that travels with the file.
   *
   * `studentId` is local - the teacher's handle for Aisha is not the one
   * Aisha's own phone uses - so it cannot tell you whether two files describe
   * the same person. This can. Your own trail has one from the start. A trail
   * a teacher opens for a student starts with none, because the teacher has
   * a name on a register and no claim yet about which record it belongs to;
   * it adopts one the first time that student's own file arrives.
   */
  readonly subjectId: string | null;
  /**
   * The account this trail has been tied to, if any.
   *
   * Distinct from `subjectId`, which starts as a locally minted id and is
   * indistinguishable from an adopted one once set. This records that the
   * adoption happened and whose it was, which is the only way to tell a
   * trail that has never met an account from one that belongs to a
   * different person's. Signing a second account into a device that already
   * holds someone's hifz has to be refused, not merged.
   */
  readonly boundAccount: string | null;
  readonly portions: readonly TrackedPortion[];
  readonly events: readonly GradeEvent[];
}

export function studentsIn(
  halaqah: Halaqah,
  students: readonly Student[]
): Student[] {
  const wanted = new Set(halaqah.studentIds);
  return students
    .filter((student) => wanted.has(student.id))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Add a student to a circle.
 *
 * Returns the circle unchanged when they are already in it, so an impatient
 * second tap on a slow phone does not produce a student who appears twice in
 * the register — the same class of bug that let a portion be tracked three
 * times and tripled the day's work.
 */
export function enrol(halaqah: Halaqah, studentId: string): Halaqah {
  if (halaqah.studentIds.includes(studentId)) return halaqah;
  return { ...halaqah, studentIds: [...halaqah.studentIds, studentId] };
}

/**
 * Remove a student from a circle.
 *
 * The student record and their trail are untouched. A child who leaves a
 * madrasah keeps what they have memorised, and a teacher removing a name from
 * a register must not be able to delete a year of someone's hifz by accident.
 */
export function withdraw(halaqah: Halaqah, studentId: string): Halaqah {
  return {
    ...halaqah,
    studentIds: halaqah.studentIds.filter((id) => id !== studentId),
  };
}

export function trailOf(
  trails: readonly StudentTrail[],
  studentId: string
): StudentTrail {
  return (
    trails.find((trail) => trail.studentId === studentId) ?? {
      studentId,
      subjectId: null,
      boundAccount: null,
      portions: [],
      events: [],
    }
  );
}
