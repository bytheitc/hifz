import { describe, expect, it } from "vitest";
import type { Portion } from "./quran";
import type { TrackedPortion } from "./srs";
import {
  RELEARN_LAPSE_THRESHOLD,
  computeProgress,
  distinctAyahs,
  mergePortions,
  needsRelearning,
  suggestNext,
} from "./progress";

const p = (surah: number, fromAyah: number, toAyah: number): Portion => ({
  id: `${surah}:${fromAyah}-${toAyah}`,
  surah,
  fromAyah,
  toAyah,
});

describe("mergePortions", () => {
  it("merges an overlapping pair so nothing is counted twice", () => {
    // The bug this module exists for: 1-10 plus 1-30 is 30 ayahs, not 40.
    expect(mergePortions([p(67, 1, 10), p(67, 1, 30)])).toEqual([
      expect.objectContaining({ surah: 67, fromAyah: 1, toAyah: 30 }),
    ]);
  });

  it("joins adjacent portions into one stretch", () => {
    expect(mergePortions([p(2, 1, 10), p(2, 11, 20)])).toEqual([
      expect.objectContaining({ fromAyah: 1, toAyah: 20 }),
    ]);
  });

  it("keeps a real gap as two portions", () => {
    expect(mergePortions([p(2, 1, 10), p(2, 20, 30)])).toHaveLength(2);
  });

  it("never merges across surahs", () => {
    expect(mergePortions([p(113, 1, 5), p(114, 1, 6)])).toHaveLength(2);
  });
});

describe("distinctAyahs", () => {
  it("does not double-count overlap", () => {
    expect(distinctAyahs([p(67, 1, 10), p(67, 1, 30)])).toBe(30);
  });

  it("adds up separate surahs", () => {
    expect(distinctAyahs([p(112, 1, 4), p(114, 1, 6)])).toBe(10);
  });
});

describe("computeProgress", () => {
  it("never exceeds 100% however the portions overlap", () => {
    const portions = [p(112, 1, 4), p(112, 1, 4), p(112, 2, 4)];
    const progress = computeProgress(portions);
    expect(progress.ayahsMemorised).toBe(4);
    expect(progress.percent).toBeLessThan(100);
  });

  it("counts a surah complete only when every ayah is covered", () => {
    expect(computeProgress([p(112, 1, 3)]).surahsComplete).toBe(0);
    expect(computeProgress([p(112, 1, 4)]).surahsComplete).toBe(1);
  });

  it("counts a surah complete when built from two adjoining portions", () => {
    expect(computeProgress([p(112, 1, 2), p(112, 3, 4)]).surahsComplete).toBe(1);
  });

  it("counts started surahs separately from complete ones", () => {
    const progress = computeProgress([p(2, 1, 10), p(112, 1, 4)]);
    expect(progress.surahsStarted).toBe(2);
    expect(progress.surahsComplete).toBe(1);
  });

  it("reports zero cleanly for an empty list", () => {
    const progress = computeProgress([]);
    expect(progress.ayahsMemorised).toBe(0);
    expect(progress.percent).toBe(0);
  });
});

describe("needsRelearning", () => {
  const tracked = (lapses: number): TrackedPortion => ({
    ...p(67, 1, 30),
    box: 0,
    lastReviewed: null,
    addedOn: "2026-10-01",
    lapses,
  });

  it("flags only portions at or past the threshold", () => {
    const list = [tracked(RELEARN_LAPSE_THRESHOLD - 1), tracked(RELEARN_LAPSE_THRESHOLD)];
    expect(needsRelearning(list)).toHaveLength(1);
  });

  it("puts the worst first", () => {
    const list = [tracked(3), tracked(9)];
    expect(needsRelearning(list)[0].lapses).toBe(9);
  });
});

describe("suggestNext", () => {
  it("suggests the shortest surahs first", () => {
    const suggestions = suggestNext([], 3);
    expect(suggestions.map((s) => s.ayahCount)).toEqual([3, 3, 3]);
  });

  it("does not suggest a surah already started", () => {
    const suggestions = suggestNext([p(103, 1, 1)], 114);
    expect(suggestions.some((s) => s.number === 103)).toBe(false);
  });
});
