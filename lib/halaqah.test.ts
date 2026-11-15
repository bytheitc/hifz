import { describe, expect, it } from "vitest";
import {
  type Halaqah,
  type Student,
  enrol,
  studentsIn,
  trailOf,
  withdraw,
} from "./halaqah";

function student(id: string, name: string): Student {
  return { id, name, joinedOn: "2026-01-01" };
}

const circle: Halaqah = {
  id: "h1",
  name: "Saturday morning",
  teacherId: "t1",
  studentIds: ["b", "a"],
};

describe("enrol", () => {
  it("adds a student to the register", () => {
    expect(enrol(circle, "c").studentIds).toEqual(["b", "a", "c"]);
  });

  it("does not add the same student twice", () => {
    // A slow phone invites an impatient second tap, and a register that lists
    // a child twice would ask the teacher to hear them twice.
    expect(enrol(circle, "a")).toBe(circle);
  });
});

describe("withdraw", () => {
  it("removes a student from the register", () => {
    expect(withdraw(circle, "a").studentIds).toEqual(["b"]);
  });

  it("is harmless for someone who was never in it", () => {
    expect(withdraw(circle, "nobody").studentIds).toEqual(["b", "a"]);
  });
});

describe("studentsIn", () => {
  it("returns the circle's students by name, not by when they joined", () => {
    const roll = [student("a", "Zaynab"), student("b", "Aisha"), student("c", "Umar")];

    expect(studentsIn(circle, roll).map((s) => s.name)).toEqual([
      "Aisha",
      "Zaynab",
    ]);
  });

  it("skips ids with no student record rather than inventing one", () => {
    const roll = [student("a", "Zaynab")];

    expect(studentsIn(circle, roll).map((s) => s.id)).toEqual(["a"]);
  });
});

describe("trailOf", () => {
  it("gives a new student an empty trail instead of nothing", () => {
    // A teacher adding a name mid-session should get a usable record at once.
    const trail = trailOf([], "fresh");

    expect(trail).toEqual({
      studentId: "fresh",
      subjectId: null,
      boundAccount: null,
      portions: [],
      events: [],
    });
  });

  it("finds an existing trail", () => {
    const mine = { studentId: "a", subjectId: null, boundAccount: null, portions: [], events: [] };

    expect(trailOf([mine], "a")).toBe(mine);
  });
});
