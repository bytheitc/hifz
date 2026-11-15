import { describe, expect, it } from "vitest";
import type { TrackedPortion } from "./srs";
import {
  TROUBLE_THRESHOLD,
  rankByTrouble,
  troubleScore,
  troubleSpots,
  troubleWeight,
  worstTroubleSpot,
} from "./trouble";

const TODAY = "2026-11-11";

function portion(over: Partial<TrackedPortion> = {}): TrackedPortion {
  return {
    id: "p",
    surah: 36,
    fromAyah: 1,
    toAyah: 40,
    box: 0,
    lastReviewed: "2026-11-01",
    addedOn: "2026-09-01",
    lapses: 0,
    ...over,
  };
}

describe("troubleScore", () => {
  it("is zero for a portion that has never lapsed", () => {
    expect(troubleScore(portion({ lapses: 0, box: 0 }), TODAY)).toBe(0);
  });

  it("rises with the number of lapses", () => {
    const one = troubleScore(portion({ lapses: 1 }), TODAY);
    const three = troubleScore(portion({ lapses: 3 }), TODAY);
    const six = troubleScore(portion({ lapses: 6 }), TODAY);
    expect(three).toBeGreaterThan(one);
    expect(six).toBeGreaterThan(three);
  });

  it("ranks recent lapses above the same count spread over years", () => {
    const recent = troubleScore(
      portion({ lapses: 3, addedOn: "2026-09-01" }),
      TODAY
    );
    const historic = troubleScore(
      portion({ lapses: 3, addedOn: "2022-09-01" }),
      TODAY
    );
    expect(recent).toBeGreaterThan(historic);
  });

  it("demotes a portion that has climbed back to a long interval", () => {
    const struggling = troubleScore(portion({ lapses: 3, box: 0 }), TODAY);
    const recovered = troubleScore(portion({ lapses: 3, box: 5 }), TODAY);
    expect(recovered).toBeLessThan(struggling);
  });

  it("never discounts a recovered portion all the way to nothing", () => {
    // Someone who has lost a surah five times deserves to still see it listed
    // even after a good run, so the recovery discount is capped.
    expect(troubleScore(portion({ lapses: 5, box: 5 }), TODAY)).toBeGreaterThan(0);
  });

  it("does not blow up for a portion added today", () => {
    const score = troubleScore(
      portion({ lapses: 1, addedOn: TODAY, lastReviewed: TODAY }),
      TODAY
    );
    expect(Number.isFinite(score)).toBe(true);
    expect(score).toBeGreaterThan(0);
  });
});

describe("rankByTrouble", () => {
  it("leaves out portions that have never lapsed", () => {
    const ranked = rankByTrouble(
      [portion({ id: "a", lapses: 0 }), portion({ id: "b", lapses: 2 })],
      TODAY
    );
    expect(ranked.map((spot) => spot.portion.id)).toEqual(["b"]);
  });

  it("orders worst first", () => {
    const ranked = rankByTrouble(
      [
        portion({ id: "mild", lapses: 1, box: 4, addedOn: "2023-01-01" }),
        portion({ id: "bad", lapses: 4, box: 0, addedOn: "2026-10-01" }),
        portion({ id: "middling", lapses: 2, box: 1, addedOn: "2026-05-01" }),
      ],
      TODAY
    );
    expect(ranked.map((spot) => spot.portion.id)).toEqual([
      "bad",
      "middling",
      "mild",
    ]);
  });

  it("breaks ties in Qur'anic order so the list does not reshuffle", () => {
    const base = { lapses: 2, box: 1, addedOn: "2026-05-01" } as const;
    const ranked = rankByTrouble(
      [
        portion({ id: "later", surah: 67, ...base }),
        portion({ id: "earlier", surah: 2, ...base }),
      ],
      TODAY
    );
    expect(ranked.map((spot) => spot.portion.id)).toEqual(["earlier", "later"]);
  });

  it("marks a portion in a long interval as recovered", () => {
    const [spot] = rankByTrouble([portion({ lapses: 3, box: 5 })], TODAY);
    expect(spot.recovered).toBe(true);
    expect(spot.reasons.join(" ")).toContain("held steady");
  });

  it("gives every ranked portion at least one plain reason", () => {
    const ranked = rankByTrouble([portion({ lapses: 2 })], TODAY);
    expect(ranked[0].reasons.length).toBeGreaterThan(0);
    for (const reason of ranked[0].reasons) {
      expect(reason.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("troubleSpots", () => {
  it("applies the threshold rather than naming every old lapse", () => {
    const faint = portion({ id: "faint", lapses: 1, box: 5, addedOn: "2020-01-01" });
    expect(troubleScore(faint, TODAY)).toBeLessThan(TROUBLE_THRESHOLD);
    expect(troubleSpots([faint], TODAY)).toEqual([]);
  });

  it("respects the limit", () => {
    const many = [1, 2, 3, 4, 5].map((n) =>
      portion({ id: `p${n}`, surah: n + 1, lapses: 4, addedOn: "2026-08-01" })
    );
    expect(troubleSpots(many, TODAY, 2)).toHaveLength(2);
  });

  it("is empty for a clean trail", () => {
    expect(troubleSpots([portion({ lapses: 0 })], TODAY)).toEqual([]);
    expect(worstTroubleSpot([portion({ lapses: 0 })], TODAY)).toBeNull();
  });
});

describe("worstTroubleSpot", () => {
  it("returns the single highest-scoring portion", () => {
    const spot = worstTroubleSpot(
      [
        portion({ id: "mild", lapses: 2, box: 2, addedOn: "2025-01-01" }),
        portion({ id: "worst", lapses: 5, box: 0, addedOn: "2026-09-01" }),
      ],
      TODAY
    );
    expect(spot?.portion.id).toBe("worst");
  });
});

describe("troubleWeight", () => {
  it("counts the ayahs carried by the listed spots", () => {
    const spots = troubleSpots(
      [
        portion({ id: "a", surah: 36, fromAyah: 1, toAyah: 40, lapses: 4 }),
        portion({ id: "b", surah: 67, fromAyah: 1, toAyah: 30, lapses: 4 }),
      ],
      TODAY
    );
    expect(troubleWeight(spots)).toBe(70);
  });
});
