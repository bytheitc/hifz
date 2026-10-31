import { describe, expect, it } from "vitest";
import {
  SURAHS,
  TOTAL_AYAHS,
  checkPortion,
  describePortion,
  surah,
} from "./quran";

describe("surah metadata", () => {
  it("has all 114 surahs, numbered without gaps", () => {
    expect(SURAHS).toHaveLength(114);
    expect(SURAHS.map((s) => s.number)).toEqual(
      Array.from({ length: 114 }, (_, i) => i + 1)
    );
  });

  it("totals 6236 ayahs", () => {
    // The canonical figure for the Hafs reading. If an edit to
    // data/quran-meta.json breaks this, the edit is wrong — this test exists
    // precisely so a one-digit typo cannot silently skew every percentage.
    const sum = SURAHS.reduce((total, s) => total + s.ayahCount, 0);
    expect(sum).toBe(6236);
    expect(TOTAL_AYAHS).toBe(6236);
  });

  it("knows the well-known lengths", () => {
    expect(surah(1)!.ayahCount).toBe(7);
    expect(surah(2)!.ayahCount).toBe(286);
    expect(surah(36)!.ayahCount).toBe(83);
    expect(surah(112)!.ayahCount).toBe(4);
    expect(surah(114)!.ayahCount).toBe(6);
  });

  it("gives every surah a name, an Arabic name and a revelation place", () => {
    for (const s of SURAHS) {
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.arabicName.length).toBeGreaterThan(0);
      expect(["Meccan", "Medinan"]).toContain(s.revelationPlace);
    }
  });
});

describe("describePortion", () => {
  it("names a whole surah without an ayah range", () => {
    expect(describePortion({ id: "x", surah: 67, fromAyah: 1, toAyah: 30 })).toBe(
      "Al-Mulk"
    );
  });

  it("shows the range for a partial surah", () => {
    expect(describePortion({ id: "x", surah: 2, fromAyah: 1, toAyah: 20 })).toBe(
      "Al-Baqarah 1–20"
    );
  });
});

describe("checkPortion", () => {
  it("accepts a valid range", () => {
    expect(checkPortion(2, 1, 286)).toBeNull();
  });

  it("rejects an ayah past the end of the surah", () => {
    expect(checkPortion(112, 1, 5)).toEqual({ kind: "out-of-range", ayahCount: 4 });
  });

  it("rejects a reversed range", () => {
    expect(checkPortion(2, 20, 10)).toEqual({ kind: "reversed" });
  });

  it("rejects a surah that does not exist", () => {
    expect(checkPortion(115, 1, 1)).toEqual({ kind: "no-such-surah" });
    expect(checkPortion(0, 1, 1)).toEqual({ kind: "no-such-surah" });
  });
});
