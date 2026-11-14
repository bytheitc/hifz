import { describe, expect, it } from "vitest";
import {
  type GradeEvent,
  applyGrades,
  lastGrade,
  mergeEvents,
  schedulingEvents,
} from "./grading";
import { type Grade, type TrackedPortion, review } from "./srs";

function portion(over: Partial<TrackedPortion> = {}): TrackedPortion {
  return {
    id: "p1",
    surah: 67,
    fromAyah: 1,
    toAyah: 30,
    box: 0,
    lastReviewed: null,
    addedOn: "2026-01-01",
    lapses: 0,
    ...over,
  };
}

let seq = 0;
function event(over: Partial<GradeEvent> = {}): GradeEvent {
  seq += 1;
  return {
    id: `e${seq}`,
    portionId: "p1",
    studentId: "s1",
    grade: "solid" as Grade,
    on: "2026-01-01",
    // Monotonic, and deliberately not wrapped: a counter that rolls over
    // makes later events look earlier and the ordering tests meaningless.
    recordedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, 0, seq)).toISOString(),
    by: { kind: "self" },
    ...over,
  };
}

const byTeacher = { kind: "teacher", teacherId: "t1" } as const;

describe("applyGrades", () => {
  it("reproduces what in-place grading used to do, for a student on their own", () => {
    // The solo path is the one that already worked, and the fold must not
    // quietly change anyone's schedule.
    const base = portion();
    const grades: [Grade, string][] = [
      ["solid", "2026-01-01"],
      ["solid", "2026-01-02"],
      ["shaky", "2026-01-05"],
      ["lost", "2026-01-06"],
      ["solid", "2026-01-07"],
    ];

    const inPlace = grades.reduce(
      (p, [grade, on]) => review(p, grade, on),
      base
    );
    const folded = applyGrades(
      base,
      grades.map(([grade, on], i) =>
        event({ id: `g${i}`, grade, on, recordedAt: `${on}T08:00:00.000Z` })
      )
    );

    expect(folded).toEqual(inPlace);
  });

  it("keeps the progress of a trail that predates the grade log", () => {
    // The upgrade case, and the one that matters most: a portion from before
    // grades were events has a real box and a real lapse count, and no
    // history that could rebuild them. Folding must start from what it has
    // rather than from zero, or every existing user loses a year of hifz on
    // the day they update.
    const carriedOver = portion({
      box: 4,
      lastReviewed: "2026-06-01",
      lapses: 2,
    });

    expect(applyGrades(carriedOver, [])).toEqual(carriedOver);
  });

  it("builds on that carried-over progress rather than restarting it", () => {
    const carriedOver = portion({
      box: 4,
      lastReviewed: "2026-06-01",
      lapses: 2,
    });
    const folded = applyGrades(carriedOver, [
      event({ grade: "solid", on: "2026-06-05" }),
    ]);

    expect(folded.box).toBe(5);
    expect(folded.lapses).toBe(2);
  });

  it("gives a newly added portion no progress it did not earn", () => {
    const fresh = portion({ box: 0, lastReviewed: null, lapses: 0 });
    const folded = applyGrades(fresh, [event({ grade: "solid" })]);

    expect(folded.box).toBe(1);
    expect(folded.lapses).toBe(0);
  });

  it("folds the same whatever order the events arrive in", () => {
    // Events arrive out of order whenever anything syncs.
    const base = portion();
    const inOrder = [
      event({ id: "a", grade: "solid", on: "2026-01-01" }),
      event({ id: "b", grade: "lost", on: "2026-01-02" }),
      event({ id: "c", grade: "solid", on: "2026-01-03" }),
    ];
    const shuffled = [inOrder[2], inOrder[0], inOrder[1]];

    expect(applyGrades(base, shuffled)).toEqual(applyGrades(base, inOrder));
  });

  it("ignores events belonging to another portion", () => {
    const folded = applyGrades(portion({ id: "mine" }), [
      event({ portionId: "mine", grade: "solid" }),
      event({ portionId: "someone-elses", grade: "lost" }),
    ]);

    expect(folded.box).toBe(1);
    expect(folded.lapses).toBe(0);
  });
});

describe("the teacher's word", () => {
  it("overrides the student's own grade for that day", () => {
    // Marked solid at home in the morning, stumbled at halaqah that evening.
    // The day ends on what the teacher heard.
    const folded = applyGrades(portion(), [
      event({ id: "self", grade: "solid", on: "2026-03-10" }),
      event({ id: "teacher", grade: "lost", on: "2026-03-10", by: byTeacher }),
    ]);

    expect(folded.box).toBe(0);
    expect(folded.lapses).toBe(1);
  });

  it("overrides it regardless of which was recorded first", () => {
    // The teacher's phone may sync hours later; precedence is about role,
    // not about who got their write in first.
    const folded = applyGrades(portion(), [
      event({
        id: "teacher",
        grade: "lost",
        on: "2026-03-10",
        recordedAt: "2026-03-10T06:00:00.000Z",
        by: byTeacher,
      }),
      event({
        id: "self",
        grade: "solid",
        on: "2026-03-10",
        recordedAt: "2026-03-10T20:00:00.000Z",
      }),
    ]);

    expect(folded.box).toBe(0);
    expect(folded.lapses).toBe(1);
  });

  it("leaves the student's revision on days the teacher was not there to hear it", () => {
    // Revising between sessions is the point of revising between sessions.
    const folded = applyGrades(portion(), [
      event({ id: "mon", grade: "solid", on: "2026-03-09" }),
      event({ id: "tue", grade: "solid", on: "2026-03-10" }),
      event({ id: "halaqah", grade: "shaky", on: "2026-03-11", by: byTeacher }),
    ]);

    // Two self-graded days advanced the box; the teacher's shaky held it.
    expect(folded.box).toBe(2);
    expect(folded.lastReviewed).toBe("2026-03-11");
  });

  it("keeps the overridden self-grade in the log rather than deleting it", () => {
    // The record of what the student believed is worth keeping: a gap between
    // their assessment and the teacher's is a teaching signal.
    const events = [
      event({ id: "self", grade: "solid", on: "2026-03-10" }),
      event({ id: "teacher", grade: "lost", on: "2026-03-10", by: byTeacher }),
    ];

    expect(schedulingEvents(events).map((e) => e.id)).toEqual(["teacher"]);
    expect(lastGrade(events, "p1")?.id).toBe("teacher");
    expect(events).toHaveLength(2);
  });

  it("gives a madrasah that records no teacher grades the solo behaviour exactly", () => {
    const selfOnly = [
      event({ id: "a", grade: "solid", on: "2026-01-01" }),
      event({ id: "b", grade: "shaky", on: "2026-01-02" }),
    ];

    expect(schedulingEvents(selfOnly)).toHaveLength(2);
  });
});

describe("mergeEvents", () => {
  it("is a union, so neither device loses a grade", () => {
    const phone = [event({ id: "a" }), event({ id: "b" })];
    const teacher = [event({ id: "b" }), event({ id: "c" })];

    expect(mergeEvents(phone, teacher).map((e) => e.id).sort()).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("is idempotent, so syncing twice changes nothing", () => {
    const log = [event({ id: "a" }), event({ id: "b" })];
    const once = mergeEvents(log, log);

    expect(mergeEvents(once, log)).toEqual(once);
  });

  it("leaves both sides folding to the same portion", () => {
    const base = portion();
    const phone = [event({ id: "a", grade: "solid", on: "2026-01-01" })];
    const teacher = [
      event({ id: "b", grade: "lost", on: "2026-01-02", by: byTeacher }),
    ];

    expect(applyGrades(base, mergeEvents(phone, teacher))).toEqual(
      applyGrades(base, mergeEvents(teacher, phone))
    );
  });
});
