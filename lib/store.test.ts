import { describe, expect, it } from "vitest";
import {
  type AppState,
  addNewPortions,
  addPortion,
  addStudent,
  currentPortions,
  emptyState,
  fromLegacy,
  mergeTrail,
  recordGrade,
  removePortion,
  replacePortions,
  setSchedule,
  takeInTrail,
  undoLastGrade,
} from "./store";
import type { TrackedPortion } from "./srs";
import type { GradeEvent } from "./grading";

const TODAY = "2026-11-13";
const SELF = "self";
const teacher = { kind: "teacher", teacherId: "t1" } as const;
const self = { kind: "self" } as const;

function portion(over: Partial<TrackedPortion> = {}): TrackedPortion {
  return {
    id: "p1",
    surah: 67,
    fromAyah: 1,
    toAyah: 30,
    box: 0,
    lastReviewed: null,
    addedOn: TODAY,
    lapses: 0,
    ...over,
  };
}

function withPortion(over: Partial<TrackedPortion> = {}): AppState {
  return addPortion(emptyState(TODAY), SELF, portion(over));
}

describe("migrating a trail from the single-trail version", () => {
  it("preserves every portion's progress exactly", () => {
    // The whole point of the baseline. Someone two years into hifz updates
    // the app and must find their boxes, review dates and lapses intact.
    const existing = [
      portion({ id: "a", box: 4, lastReviewed: "2026-11-01", lapses: 2 }),
      portion({ id: "b", surah: 36, box: 1, lastReviewed: "2026-10-25", lapses: 3 }),
    ];

    const state = fromLegacy(existing, TODAY);

    expect(currentPortions(state, SELF)).toEqual(existing);
  });

  it("carries on from that progress rather than restarting it", () => {
    const state = fromLegacy([portion({ box: 3, lastReviewed: "2026-11-01" })], TODAY);
    const graded = recordGrade(state, SELF, "p1", "solid", TODAY, self);

    expect(currentPortions(graded, SELF)[0].box).toBe(4);
  });

  it("gives someone with no previous trail an empty one, not a broken one", () => {
    expect(currentPortions(fromLegacy([], TODAY), SELF)).toEqual([]);
  });
});

describe("recording grades", () => {
  it("advances the portion without touching its baseline", () => {
    // If a fold were written back over the baseline, the next fold would
    // apply the same grade twice and the box would run away.
    const state = recordGrade(withPortion(), SELF, "p1", "solid", TODAY, self);

    expect(state.trails[0].portions[0].box).toBe(0);
    expect(currentPortions(state, SELF)[0].box).toBe(1);
  });

  it("stays correct when the same portion is graded on many days", () => {
    let state = withPortion();
    for (const day of ["2026-11-13", "2026-11-14", "2026-11-17"]) {
      state = recordGrade(state, SELF, "p1", "solid", day, self);
    }

    expect(currentPortions(state, SELF)[0].box).toBe(3);
    expect(state.trails[0].events).toHaveLength(3);
  });

  it("lets the teacher's assessment override the student's for the day", () => {
    let state = withPortion();
    state = recordGrade(state, SELF, "p1", "solid", TODAY, self);
    state = recordGrade(state, SELF, "p1", "lost", TODAY, teacher);

    const [folded] = currentPortions(state, SELF);
    expect(folded.box).toBe(0);
    expect(folded.lapses).toBe(1);
    // Both are still on the record.
    expect(state.trails[0].events).toHaveLength(2);
  });
});

describe("undoing a grade", () => {
  it("removes the mis-tap instead of recording a correction", () => {
    let state = withPortion();
    state = recordGrade(state, SELF, "p1", "lost", TODAY, self);
    state = undoLastGrade(state, SELF, "p1");

    expect(state.trails[0].events).toHaveLength(0);
    expect(currentPortions(state, SELF)[0].box).toBe(0);
    expect(currentPortions(state, SELF)[0].lapses).toBe(0);
  });

  it("takes back only the last one, leaving real history alone", () => {
    let state = withPortion();
    state = recordGrade(state, SELF, "p1", "solid", "2026-11-11", self);
    state = recordGrade(state, SELF, "p1", "lost", "2026-11-13", self);
    state = undoLastGrade(state, SELF, "p1");

    expect(state.trails[0].events).toHaveLength(1);
    expect(currentPortions(state, SELF)[0].box).toBe(1);
  });

  it("is harmless when there is nothing to undo", () => {
    const state = withPortion();
    expect(undoLastGrade(state, SELF, "p1")).toBe(state);
  });
});

describe("removing a portion", () => {
  it("takes its grades with it", () => {
    // Orphaned events would re-attach to any future portion minted with the
    // same id.
    let state = withPortion();
    state = recordGrade(state, SELF, "p1", "solid", TODAY, self);
    state = removePortion(state, SELF, "p1");

    expect(state.trails[0].portions).toHaveLength(0);
    expect(state.trails[0].events).toHaveLength(0);
  });

  it("leaves other portions' grades alone", () => {
    let state = addPortion(withPortion(), SELF, portion({ id: "p2", surah: 36 }));
    state = recordGrade(state, SELF, "p1", "solid", TODAY, self);
    state = recordGrade(state, SELF, "p2", "solid", TODAY, self);
    state = removePortion(state, SELF, "p1");

    expect(state.trails[0].events.map((e) => e.portionId)).toEqual(["p2"]);
  });
});

describe("restoring from a backup", () => {
  it("keeps the progress the file recorded", () => {
    const restored = [portion({ id: "r1", box: 3, lastReviewed: "2026-11-02" })];
    const state = replacePortions(emptyState(TODAY), SELF, restored);

    expect(currentPortions(state, SELF)).toEqual(restored);
  });

  it("drops grades belonging to portions the restore removed", () => {
    let state = withPortion();
    state = recordGrade(state, SELF, "p1", "solid", TODAY, self);
    state = replacePortions(state, SELF, [portion({ id: "other" })]);

    expect(state.trails[0].events).toHaveLength(0);
  });
});

describe("taking on restored portions", () => {
  it("does not count an existing portion's grades twice", () => {
    // mergeBackup returns the whole trail with progress already folded in.
    // Storing that as a baseline beside the events that produced it would
    // apply every grade a second time.
    let state = withPortion();
    state = recordGrade(state, SELF, "p1", "solid", "2026-11-11", self);
    state = recordGrade(state, SELF, "p1", "solid", "2026-11-12", self);

    const asBackupWouldReturn = currentPortions(state, SELF);
    expect(asBackupWouldReturn[0].box).toBe(2);

    const after = addNewPortions(state, SELF, asBackupWouldReturn);

    expect(currentPortions(after, SELF)[0].box).toBe(2);
  });

  it("adds the portions the file brought that were not here", () => {
    const state = addNewPortions(withPortion(), SELF, [
      portion({ id: "p1" }),
      portion({ id: "new", surah: 36, box: 2, lastReviewed: "2026-11-01" }),
    ]);

    expect(state.trails[0].portions.map((p) => p.id)).toEqual(["p1", "new"]);
    // And the restored one keeps the progress the file recorded.
    expect(currentPortions(state, SELF).find((p) => p.id === "new")?.box).toBe(2);
  });
});

describe("students", () => {
  it("gives a new student their own empty trail", () => {
    const { state, student } = addStudent(emptyState(TODAY), " Aisha ", TODAY);

    expect(student.name).toBe("Aisha");
    expect(currentPortions(state, student.id)).toEqual([]);
  });

  it("keeps one student's grading off another's trail", () => {
    const { state: withAisha, student } = addStudent(emptyState(TODAY), "Aisha", TODAY);
    let state = addPortion(withAisha, student.id, portion({ id: "hers" }));
    state = addPortion(state, SELF, portion({ id: "mine" }));
    state = recordGrade(state, student.id, "hers", "solid", TODAY, teacher);

    expect(currentPortions(state, student.id)[0].box).toBe(1);
    expect(currentPortions(state, SELF)[0].box).toBe(0);
  });
});

describe("mergeTrail", () => {
  it("folds another device's grades in without losing either side's", () => {
    let mine = withPortion();
    mine = recordGrade(mine, SELF, "p1", "solid", "2026-11-11", self);

    const theirs = {
      studentId: SELF,
      subjectId: null,
      boundAccount: null,
      portions: [portion()],
      events: [
        {
          id: "remote",
          portionId: "p1",
          studentId: SELF,
          grade: "solid" as const,
          on: "2026-11-12",
          recordedAt: "2026-11-12T09:00:00.000Z",
          by: teacher,
        },
      ],
    };

    const merged = mergeTrail(mine, theirs);

    expect(merged.trails[0].events).toHaveLength(2);
    expect(currentPortions(merged, SELF)[0].box).toBe(2);
  });

  it("does not duplicate a portion both devices already had", () => {
    const mine = withPortion();
    const merged = mergeTrail(mine, {
      studentId: SELF,
      subjectId: null,
      boundAccount: null,
      portions: [portion()],
      events: [],
    });

    expect(merged.trails[0].portions).toHaveLength(1);
  });
});

describe("taking in a student's own file", () => {
  /** Narrows the outcome: these cases are all meant to go through, and a
   *  refusal here is a test failure, not a branch to handle. */
  function mustTakeIn(
    state: AppState,
    studentId: string,
    incoming: Parameters<typeof takeInTrail>[2]
  ) {
    const outcome = takeInTrail(state, studentId, incoming);
    if (!outcome.ok) throw new Error(`unexpectedly refused: ${outcome.reason}`);
    return outcome;
  }

  // The student's device minted its own ids. Nothing in the file matches
  // what the teacher's device calls the same portion.
  const studentsCopy = (over = {}) => ({
    id: "phone-xyz",
    surah: 67,
    fromAyah: 1,
    toAyah: 30,
    box: 0,
    lastReviewed: null,
    addedOn: "2026-09-01",
    lapses: 0,
    ...over,
  });

  function selfGrade(portionId: string, on: string, id: string, grade = "solid") {
    return {
      id,
      portionId,
      studentId: "their-device",
      grade: grade as "solid",
      on,
      recordedAt: `${on}T07:00:00.000Z`,
      by: self,
    };
  }

  function teacherHas(over = {}) {
    // The teacher already tracks the same range, under their own id.
    return addPortion(emptyState(TODAY), SELF, portion({ id: "teacher-abc", ...over }));
  }

  it("matches the same range rather than duplicating it", () => {
    const { state, added, alreadyHad } = mustTakeIn(teacherHas(), SELF, {
      portions: [studentsCopy()],
      events: [],
    });

    expect(added).toBe(0);
    expect(alreadyHad).toBe(1);
    expect(state.trails[0].portions).toHaveLength(1);
    expect(state.trails[0].portions[0].id).toBe("teacher-abc");
  });

  it("re-points the student's grades at the teacher's copy, so they count", () => {
    const { state, grades } = mustTakeIn(teacherHas(), SELF, {
      portions: [studentsCopy()],
      events: [
        selfGrade("phone-xyz", "2026-11-10", "e1"),
        selfGrade("phone-xyz", "2026-11-11", "e2"),
      ],
    });

    expect(grades).toBe(2);
    expect(state.trails[0].events.every((e: GradeEvent) => e.portionId === "teacher-abc")).toBe(true);
    // And they actually move the schedule on the teacher's device.
    expect(currentPortions(state, SELF)[0].box).toBe(2);
  });

  it("adds nothing the second time the same file is handed over", () => {
    const file = {
      portions: [studentsCopy()],
      events: [selfGrade("phone-xyz", "2026-11-10", "e1")],
    };
    const once = mustTakeIn(teacherHas(), SELF, file);
    const twice = mustTakeIn(once.state, SELF, file);

    expect(twice.added).toBe(0);
    expect(twice.grades).toBe(0);
    expect(twice.state.trails[0].events).toHaveLength(1);
    expect(currentPortions(twice.state, SELF)[0].box).toBe(1);
  });

  it("keeps a range the student tracks more than once", () => {
    // Three records on their phone, one on the teacher's: one is matched and
    // the other two are taken on, because they are real records.
    const { state, added, alreadyHad } = mustTakeIn(teacherHas(), SELF, {
      portions: [
        studentsCopy({ id: "a" }),
        studentsCopy({ id: "b" }),
        studentsCopy({ id: "c" }),
      ],
      events: [],
    });

    expect(alreadyHad).toBe(1);
    expect(added).toBe(2);
    expect(state.trails[0].portions).toHaveLength(3);
  });

  it("takes on portions the teacher never knew about, with their progress", () => {
    const { state, added } = mustTakeIn(teacherHas(), SELF, {
      portions: [studentsCopy({ id: "new", surah: 36, toAyah: 40, box: 3, lastReviewed: "2026-11-01" })],
      events: [],
    });

    expect(added).toBe(1);
    const theirs = currentPortions(state, SELF).find((p) => p.surah === 36);
    expect(theirs?.box).toBe(3);
  });

  it("leaves the teacher's own halaqah grades standing, and still lets them win", () => {
    // The teacher marked it lost in halaqah on the 10th. The student's file
    // claims solid that same day, and solid again on the 12th.
    let state = teacherHas();
    state = recordGrade(state, SELF, "teacher-abc", "lost", "2026-11-10", teacher);

    const { state: after } = mustTakeIn(state, SELF, {
      portions: [studentsCopy()],
      events: [
        selfGrade("phone-xyz", "2026-11-10", "s1"),
        selfGrade("phone-xyz", "2026-11-12", "s2"),
      ],
    });

    expect(after.trails[0].events).toHaveLength(3);
    const [folded] = currentPortions(after, SELF);
    // The 10th is the teacher's; the 12th is the student's and counts.
    expect(folded.lapses).toBe(1);
    expect(folded.box).toBe(1);
    expect(folded.lastReviewed).toBe("2026-11-12");
  });

  it("ignores grades pointing at a portion the file did not carry", () => {
    const { state, grades } = mustTakeIn(teacherHas(), SELF, {
      portions: [studentsCopy()],
      events: [selfGrade("not-in-this-file", "2026-11-10", "orphan")],
    });

    expect(grades).toBe(0);
    expect(state.trails[0].events).toHaveLength(0);
  });
});

describe("whose record a file is", () => {
  const aishasPhone = { id: "subject-aisha", name: null };
  const umarsPhone = { id: "subject-umar", name: "Umar" };
  const file = (subject: { id: string; name: string | null } | null) => ({
    portions: [portion({ id: "theirs" })],
    events: [],
    subject,
  });

  function teacherOpened(name: string) {
    // A register entry: a name, and no claim yet about whose record it is.
    return addStudent(emptyState(TODAY), name, TODAY);
  }

  it("adopts the subject the first time that student's own file arrives", () => {
    const { state, student } = teacherOpened("Aisha");
    const outcome = takeInTrail(state, student.id, file(aishasPhone));

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(
      outcome.state.trails.find((t) => t.studentId === student.id)?.subjectId
    ).toBe("subject-aisha");
  });

  it("refuses a file belonging to a different person", () => {
    // The usual cause is two files in the same downloads folder. Merging
    // someone else's hifz into this trail would be close to unpickable.
    const { state, student } = teacherOpened("Aisha");
    const first = takeInTrail(state, student.id, file(aishasPhone));
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = takeInTrail(first.state, student.id, file(umarsPhone));

    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.subjectName).toBe("Umar");
  });

  it("changes nothing at all when it refuses", () => {
    const { state, student } = teacherOpened("Aisha");
    const first = takeInTrail(state, student.id, file(aishasPhone));
    if (!first.ok) throw new Error("setup failed");

    const before = JSON.stringify(first.state);
    takeInTrail(first.state, student.id, file(umarsPhone));

    expect(JSON.stringify(first.state)).toBe(before);
  });

  it("takes the same person's file back, however many times it travels", () => {
    // The round trip: student to teacher, teacher back to student.
    const { state, student } = teacherOpened("Aisha");
    const there = takeInTrail(state, student.id, file(aishasPhone));
    if (!there.ok) throw new Error("setup failed");
    const andBack = takeInTrail(there.state, student.id, file(aishasPhone));

    expect(andBack.ok).toBe(true);
  });

  it("takes a file that makes no claim about whose it is", () => {
    // Version 1 files, and the first version 2 files, carry no subject.
    // Refusing them would break every backup made before this existed.
    const { state, student } = teacherOpened("Aisha");
    const adopted = takeInTrail(state, student.id, file(aishasPhone));
    if (!adopted.ok) throw new Error("setup failed");

    expect(takeInTrail(adopted.state, student.id, file(null)).ok).toBe(true);
  });

  it("guards your own trail against a file that is not yours", () => {
    const outcome = takeInTrail(emptyState(TODAY), SELF, file(umarsPhone));

    expect(outcome.ok).toBe(false);
  });
});

describe("the revision schedule", () => {
  it("starts on the standard ladder", () => {
    expect(emptyState(TODAY).schedule).toEqual({ preset: "standard" });
  });

  it("changes only the setting: no portion, grade or history is touched", () => {
    let state = withPortion({ id: "p9" });
    for (let i = 0; i < 5; i++) state = recordGrade(state, SELF, "p9", "solid", `2026-11-0${i + 1}`, self);

    const shortened = setSchedule(state, { preset: "custom", days: [1, 3, 7, 16] });
    expect(shortened.trails).toBe(state.trails);
    expect(currentPortions(shortened, SELF)[0].box).toBe(3);

    const back = setSchedule(shortened, { preset: "standard" });
    expect(currentPortions(back, SELF)).toEqual(currentPortions(state, SELF));
    expect(currentPortions(back, SELF)[0].box).toBe(5);
    expect(back.trails[0].events).toHaveLength(5);
  });

  it("keeps a portion that was already further along than the new ladder", () => {
    const state = setSchedule(withPortion({ id: "far", box: 5, lastReviewed: "2026-11-01", lapses: 1 }), { preset: "custom", days: [1, 3, 7, 16] });
    const [p] = currentPortions(state, SELF);
    expect(p.id).toBe("far");
    expect(p.lapses).toBe(1);
    expect(currentPortions(state, SELF)).toHaveLength(1);
  });
});
