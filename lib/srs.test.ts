import { describe, expect, it } from "vitest";
import {
  type TrackedPortion,
  MAX_BOX,
  MAX_STAGES,
  PRESETS,
  REVIEW_INTERVALS_DAYS,
  checkLadder,
  effectiveBox,
  ladderOf,
  parseLadder,
  parseSchedule,
  addDays,
  daysBetween,
  dueDate,
  dueOn,
  isDue,
  review,
  toDateOnly,
  upcomingLoad,
} from "./srs";

const portion = (over: Partial<TrackedPortion> = {}): TrackedPortion => ({
  id: "p1",
  surah: 67,
  fromAyah: 1,
  toAyah: 30,
  box: 0,
  lastReviewed: null,
  addedOn: "2026-10-01",
  lapses: 0,
  ...over,
});

describe("date arithmetic", () => {
  it("crosses a month boundary", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
  });

  it("crosses a year boundary", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("handles a leap day", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("counts days between dates, signed", () => {
    expect(daysBetween("2026-10-01", "2026-10-08")).toBe(7);
    expect(daysBetween("2026-10-08", "2026-10-01")).toBe(-7);
  });

  it("round-trips a Date without shifting the day", () => {
    expect(toDateOnly(new Date(2026, 9, 31))).toBe("2026-10-31");
  });
});

describe("dueDate", () => {
  it("makes new hifz due the day it was added, not the next day", () => {
    expect(dueDate(portion({ addedOn: "2026-10-01" }))).toBe("2026-10-01");
  });

  it("uses the interval for the current box", () => {
    expect(dueDate(portion({ box: 0, lastReviewed: "2026-10-01" }))).toBe("2026-10-02");
    expect(dueDate(portion({ box: 2, lastReviewed: "2026-10-01" }))).toBe("2026-10-08");
  });

  it("does not run off the end of the interval table", () => {
    const far = dueDate(portion({ box: 99, lastReviewed: "2026-10-01" }));
    expect(far).toBe(addDays("2026-10-01", REVIEW_INTERVALS_DAYS[MAX_BOX]));
  });
});

describe("isDue", () => {
  it("is due on the day itself and after, not before", () => {
    const p = portion({ box: 0, lastReviewed: "2026-10-01" }); // due 10-02
    expect(isDue(p, "2026-10-01")).toBe(false);
    expect(isDue(p, "2026-10-02")).toBe(true);
    expect(isDue(p, "2026-10-09")).toBe(true);
  });
});

describe("review", () => {
  it("advances the box when solid", () => {
    expect(review(portion({ box: 1 }), "solid", "2026-10-05").box).toBe(2);
  });

  it("holds the box when shaky — ground kept, none gained", () => {
    expect(review(portion({ box: 3 }), "shaky", "2026-10-05").box).toBe(3);
  });

  it("drops all the way to box 0 when lost, and counts the lapse", () => {
    const after = review(portion({ box: 4, lapses: 1 }), "lost", "2026-10-05");
    expect(after.box).toBe(0);
    expect(after.lapses).toBe(2);
  });

  it("does not count a lapse for shaky or solid", () => {
    expect(review(portion(), "shaky", "2026-10-05").lapses).toBe(0);
    expect(review(portion(), "solid", "2026-10-05").lapses).toBe(0);
  });

  it("never pushes the box past the last interval", () => {
    expect(review(portion({ box: MAX_BOX }), "solid", "2026-10-05").box).toBe(MAX_BOX);
  });

  it("records the date it was reviewed", () => {
    expect(review(portion(), "solid", "2026-10-05").lastReviewed).toBe("2026-10-05");
  });
});

describe("dueOn", () => {
  it("returns the day's work in Qur'anic order, not most-overdue-first", () => {
    const portions = [
      portion({ id: "late", surah: 114, addedOn: "2026-01-01" }),
      portion({ id: "early", surah: 2, addedOn: "2026-10-01" }),
    ];
    expect(dueOn(portions, "2026-10-05").map((p) => p.id)).toEqual(["early", "late"]);
  });

  it("orders by ayah within the same surah", () => {
    const portions = [
      portion({ id: "b", surah: 2, fromAyah: 21, toAyah: 40 }),
      portion({ id: "a", surah: 2, fromAyah: 1, toAyah: 20 }),
    ];
    expect(dueOn(portions, "2026-10-05").map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("leaves out what is not due yet", () => {
    const portions = [portion({ box: 5, lastReviewed: "2026-10-01" })];
    expect(dueOn(portions, "2026-10-05")).toHaveLength(0);
  });
});

describe("upcomingLoad", () => {
  it("reports each day separately rather than cumulatively", () => {
    const portions = [
      portion({ id: "a", box: 0, lastReviewed: "2026-10-01", toAyah: 10 }), // due 10-02
      portion({ id: "b", box: 1, lastReviewed: "2026-10-01", toAyah: 30 }), // due 10-04
    ];
    const load = upcomingLoad(portions, "2026-10-02", 4);
    expect(load.map((d) => d.portions)).toEqual([1, 0, 1, 0]);
    expect(load[0].ayahs).toBe(10);
    expect(load[2].ayahs).toBe(30);
  });

  it("returns exactly the number of days asked for", () => {
    expect(upcomingLoad([], "2026-10-02", 7)).toHaveLength(7);
  });
});

describe("upcomingLoad and overdue work", () => {
  it("counts overdue portions on the first day rather than losing them", () => {
    // Matching dates exactly made a backlog disappear from the chart, which is
    // precisely when a student most needs to see it.
    const overdue = portion({ id: "old", box: 0, lastReviewed: "2026-09-01", toAyah: 25 });
    const load = upcomingLoad([overdue], "2026-10-31", 3);
    expect(load[0].portions).toBe(1);
    expect(load[0].ayahs).toBe(25);
    expect(load.slice(1).every((day) => day.portions === 0)).toBe(true);
  });

  it("still does not repeat a portion across days", () => {
    const overdue = portion({ id: "old", box: 0, lastReviewed: "2026-09-01" });
    const load = upcomingLoad([overdue], "2026-10-31", 5);
    expect(load.reduce((sum, day) => sum + day.portions, 0)).toBe(1);
  });
});

describe("revision presets", () => {
  it("keeps the standard preset identical to the original fixed table", () => {
    expect(PRESETS.standard).toEqual([1, 3, 7, 16, 35, 90]);
    expect(ladderOf({ preset: "standard" })).toEqual(REVIEW_INTERVALS_DAYS);
  });

  it("makes gentle longer and intensive shorter than standard at every stage", () => {
    PRESETS.standard.forEach((days, i) => {
      expect(PRESETS.gentle[i]).toBeGreaterThan(days);
      expect(PRESETS.intensive[i]).toBeLessThanOrEqual(days);
    });
  });

  it("gives every preset a strictly increasing, valid ladder", () => {
    for (const ladder of Object.values(PRESETS)) expect(checkLadder(ladder)).toBeNull();
  });

  it("schedules the same grade differently on each preset", () => {
    const p = portion({ box: 1, lastReviewed: "2026-10-01" });
    expect(dueDate(p, PRESETS.gentle)).toBe("2026-10-06");
    expect(dueDate(p, PRESETS.standard)).toBe("2026-10-04");
    expect(dueDate(p, PRESETS.intensive)).toBe("2026-10-03");
  });

  it("reviews on the chosen ladder, climbing to its own last stage", () => {
    const four = [1, 2, 5, 10];
    let p = portion();
    for (let i = 0; i < 10; i++) p = review(p, "solid", "2026-10-01", four);
    expect(p.box).toBe(3);
  });

  it("shows load on the chosen ladder", () => {
    const p = portion({ box: 0, lastReviewed: "2026-10-01" });
    const standard = upcomingLoad([p], "2026-10-02", 3, PRESETS.standard);
    const gentle = upcomingLoad([p], "2026-10-02", 3, PRESETS.gentle);
    expect(standard[0].portions).toBe(1);
    expect(gentle[0].portions).toBe(0);
    expect(gentle[1].portions).toBe(1);
  });
});

describe("a portion further along than the ladder it meets", () => {
  const four = [1, 3, 7, 16];
  const stage6 = portion({ box: 5, lastReviewed: "2026-10-01", lapses: 2 });

  it("is treated as being at the last stage, not dropped or errored", () => {
    expect(effectiveBox(stage6, four)).toBe(3);
    expect(dueDate(stage6, four)).toBe("2026-10-17");
    expect(isDue(stage6, "2026-10-16", four)).toBe(false);
    expect(isDue(stage6, "2026-10-17", four)).toBe(true);
  });

  it("is not rewritten by merely being looked at", () => {
    const before = { ...stage6 };
    dueDate(stage6, four);
    isDue(stage6, "2026-10-17", four);
    expect(stage6).toEqual(before);
  });

  it("keeps its lapses and review date when graded on the shorter ladder", () => {
    const solid = review(stage6, "solid", "2026-10-17", four);
    expect(solid.box).toBe(3);
    expect(solid.lapses).toBe(2);
    expect(solid.lastReviewed).toBe("2026-10-17");
    expect(review(stage6, "shaky", "2026-10-17", four).box).toBe(3);
    expect(review(stage6, "lost", "2026-10-17", four).box).toBe(0);
  });

  it("goes back to its original due date when the longer ladder returns", () => {
    expect(dueDate(stage6, REVIEW_INTERVALS_DAYS)).toBe("2026-12-30");
  });

  it("is never due earlier than its last review, even on a one-stage ladder", () => {
    expect(dueDate(stage6, [5])).toBe("2026-10-06");
  });
});

describe("parseLadder", () => {
  it("reads commas, spaces or both", () => {
    expect(parseLadder("1, 4, 10, 30")).toEqual({ ok: true, ladder: [1, 4, 10, 30] });
    expect(parseLadder("1 4 10")).toEqual({ ok: true, ladder: [1, 4, 10] });
    expect(parseLadder(" 2,5 ")).toEqual({ ok: true, ladder: [2, 5] });
  });

  it("refuses anything that would make a nonsense schedule", () => {
    expect(parseLadder("")).toEqual({ ok: false, problem: "empty" });
    expect(parseLadder("1, 0, 3")).toEqual({ ok: false, problem: "not-a-whole-number" });
    expect(parseLadder("1, 2.5")).toEqual({ ok: false, problem: "not-a-whole-number" });
    expect(parseLadder("1, x")).toEqual({ ok: false, problem: "not-a-whole-number" });
    expect(parseLadder("1, 400")).toEqual({ ok: false, problem: "too-long" });
    expect(parseLadder("5, 3")).toEqual({ ok: false, problem: "not-increasing" });
    expect(parseLadder("3, 3")).toEqual({ ok: false, problem: "not-increasing" });
    const eleven = Array.from({ length: MAX_STAGES + 1 }, (_, i) => i + 1).join(",");
    expect(parseLadder(eleven)).toEqual({ ok: false, problem: "too-many" });
  });
});

describe("parseSchedule", () => {
  it("reads each preset and a valid custom ladder back", () => {
    expect(parseSchedule({ preset: "gentle" })).toEqual({ preset: "gentle" });
    expect(parseSchedule({ preset: "custom", days: [1, 5, 20] })).toEqual({ preset: "custom", days: [1, 5, 20] });
  });

  it("falls back to standard for anything unusable, rather than failing to load the trail", () => {
    for (const bad of [undefined, null, 3, {}, { preset: "wild" }, { preset: "custom" }, { preset: "custom", days: [3, 1] }]) {
      expect(parseSchedule(bad)).toEqual({ preset: "standard" });
    }
  });
});
