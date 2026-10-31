import { describe, expect, it } from "vitest";
import {
  type TrackedPortion,
  MAX_BOX,
  REVIEW_INTERVALS_DAYS,
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
