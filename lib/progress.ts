import { SURAHS, TOTAL_AYAHS, type Portion, ayahsIn, surah } from "./quran";
import type { TrackedPortion } from "./srs";

/**
 * Progress has one trap in it, and it is the reason this is a module rather
 * than a `reduce` in a component: portions can overlap. A student memorises
 * Al-Mulk 1–10, then later adds Al-Mulk 1–30 without deleting the first
 * entry. Summing `ayahsIn` over the list gives 40 ayahs in a 30-ayah surah,
 * and a progress bar that reads over 100% destroys trust in every other
 * number on the page. So we count distinct ayahs, always.
 */

/** Merge overlapping or adjacent portions within a single surah. */
export function mergePortions(portions: readonly Portion[]): Portion[] {
  const bySurah = new Map<number, Portion[]>();
  for (const portion of portions) {
    const list = bySurah.get(portion.surah) ?? [];
    list.push(portion);
    bySurah.set(portion.surah, list);
  }

  const merged: Portion[] = [];
  for (const [surahNumber, list] of [...bySurah.entries()].sort((a, b) => a[0] - b[0])) {
    const sorted = [...list].sort((a, b) => a.fromAyah - b.fromAyah);
    let current = { ...sorted[0] };

    for (const portion of sorted.slice(1)) {
      // `<= toAyah + 1` so that 1–10 and 11–20 become 1–20: they are adjacent,
      // not overlapping, and leaving them apart would report two portions
      // where the student has one continuous stretch.
      if (portion.fromAyah <= current.toAyah + 1) {
        current = {
          ...current,
          toAyah: Math.max(current.toAyah, portion.toAyah),
        };
      } else {
        merged.push(current);
        current = { ...portion };
      }
    }
    merged.push(current);
    void surahNumber;
  }

  return merged;
}

export function distinctAyahs(portions: readonly Portion[]): number {
  return mergePortions(portions).reduce((sum, portion) => sum + ayahsIn(portion), 0);
}

export interface Progress {
  readonly ayahsMemorised: number;
  readonly totalAyahs: number;
  readonly percent: number;
  readonly surahsComplete: number;
  readonly surahsStarted: number;
}

export function computeProgress(portions: readonly Portion[]): Progress {
  const merged = mergePortions(portions);
  const ayahsMemorised = merged.reduce((sum, portion) => sum + ayahsIn(portion), 0);

  const started = new Set(merged.map((portion) => portion.surah));
  let surahsComplete = 0;
  for (const surahNumber of started) {
    const info = surah(surahNumber);
    if (!info) continue;
    const covered = merged
      .filter((portion) => portion.surah === surahNumber)
      .reduce((sum, portion) => sum + ayahsIn(portion), 0);
    if (covered >= info.ayahCount) surahsComplete += 1;
  }

  return {
    ayahsMemorised,
    totalAyahs: TOTAL_AYAHS,
    percent: (ayahsMemorised / TOTAL_AYAHS) * 100,
    surahsComplete,
    surahsStarted: started.size,
  };
}

/**
 * Portions whose recall is shaky enough to be worth naming. Three lapses is
 * the point at which "revise it again next week" has visibly stopped working
 * and the honest advice is to go back and re-learn the passage properly.
 */
export const RELEARN_LAPSE_THRESHOLD = 3;

export function needsRelearning(
  portions: readonly TrackedPortion[]
): TrackedPortion[] {
  return portions
    .filter((portion) => portion.lapses >= RELEARN_LAPSE_THRESHOLD)
    .sort((a, b) => b.lapses - a.lapses);
}

/** Surahs not yet started, shortest first — the list a student scans when
 *  choosing what to take on next, and short surahs are where most people
 *  should start. */
export function suggestNext(portions: readonly Portion[], limit = 5) {
  const started = new Set(mergePortions(portions).map((p) => p.surah));
  return SURAHS.filter((s) => !started.has(s.number))
    .slice()
    .sort((a, b) => a.ayahCount - b.ayahCount)
    .slice(0, limit);
}
