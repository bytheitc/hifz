import meta from "@/data/quran-meta.json";

/**
 * Static surah metadata. There is no Qur'an API call anywhere in this project
 * and there should never be one: the app tracks *what you have memorised*,
 * not the text itself, so all it needs is the shape of the book — 114 surahs
 * and how many ayahs each holds. That fits in a file, works offline, and
 * means a contributor needs no key to run anything.
 */

export interface Surah {
  readonly number: number;
  readonly name: string;
  readonly arabicName: string;
  readonly englishName: string;
  readonly ayahCount: number;
  readonly revelationPlace: "Meccan" | "Medinan";
}

export const SURAHS: readonly Surah[] = meta.surahs as readonly Surah[];

/** 6236 in the Hafs reading. Asserted by a test, because a silent typo in the
 *  data file would quietly skew every percentage the app shows. */
export const TOTAL_AYAHS = meta.totalAyahs;

export function surah(number: number): Surah | undefined {
  return SURAHS[number - 1];
}

/** A contiguous run of ayahs within one surah. Portions do not span surahs:
 *  people memorise and revise surah by surah, and allowing a portion to run
 *  from the end of one into the next would complicate every calculation here
 *  for a case nobody asked for. */
export interface Portion {
  readonly id: string;
  readonly surah: number;
  readonly fromAyah: number;
  readonly toAyah: number;
}

export function ayahsIn(portion: Portion): number {
  return portion.toAyah - portion.fromAyah + 1;
}

/** Human label: "Al-Mulk" for a whole surah, "Al-Baqarah 1–20" for a part. */
export function describePortion(portion: Portion): string {
  const info = surah(portion.surah);
  const name = info ? info.name : `Surah ${portion.surah}`;
  if (info && portion.fromAyah === 1 && portion.toAyah === info.ayahCount) return name;
  return `${name} ${portion.fromAyah}–${portion.toAyah}`;
}

export type PortionProblem =
  | { kind: "no-such-surah" }
  | { kind: "reversed" }
  | { kind: "out-of-range"; ayahCount: number };

/**
 * Validate a portion before it is stored. Returns the problem rather than
 * throwing, because every caller is a form that wants to show the student a
 * sentence, and an exception would have to be translated back into one.
 */
export function checkPortion(
  surahNumber: number,
  fromAyah: number,
  toAyah: number
): PortionProblem | null {
  const info = surah(surahNumber);
  if (!info) return { kind: "no-such-surah" };
  if (toAyah < fromAyah) return { kind: "reversed" };
  if (fromAyah < 1 || toAyah > info.ayahCount)
    return { kind: "out-of-range", ayahCount: info.ayahCount };
  return null;
}
