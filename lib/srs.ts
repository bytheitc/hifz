import { type Portion, ayahsIn } from "./quran";

/**
 * Revision scheduling for hifz.
 *
 * This is a spaced-repetition scheduler, but it is deliberately not a
 * flashcard scheduler, and the differences matter:
 *
 * 1. Forgetting is asymmetric. Losing a vocabulary card costs you a word.
 *    Losing a portion of Qur'an you spent a month on is a different kind of
 *    loss, so a lapse here drops you all the way back to a one-day interval
 *    rather than easing you down a step.
 *
 * 2. The queue is ordered by the mushaf, not by urgency. Every scheduler
 *    worth the name sorts the day's work most-overdue-first. People revising
 *    hifz do not: they go in order, because that is how the text sits in
 *    memory, and jumping around is itself disruptive. So `dueOn` returns the
 *    day's portions in Qur'anic order and we accept the small loss in
 *    theoretical efficiency.
 *
 * 3. There are only three grades, not six. Asking someone to rate their
 *    recall from 0 to 5 immediately after reciting invites noise. "Solid",
 *    "shaky" and "lost" are distinctions a person can actually make.
 */

export type Grade = "solid" | "shaky" | "lost";

/** A date with no time of day, as "YYYY-MM-DD".
 *  Times of day have no meaning in a daily revision schedule, and carrying a
 *  timestamp would make "due today" depend on the user's timezone. */
export type DateOnly = string;

export interface TrackedPortion extends Portion {
  /** Leitner box, 0-based. Index into REVIEW_INTERVALS_DAYS. */
  readonly box: number;
  readonly lastReviewed: DateOnly | null;
  readonly addedOn: DateOnly;
  /** How many times this has been graded "lost". A portion with several
   *  lapses is one the student should probably re-learn rather than keep
   *  cycling, and the UI can say so. */
  readonly lapses: number;
}

/**
 * Days until the next review, by box. The first few are tight because fresh
 * hifz decays fast; the tail is long because a portion that has survived five
 * correct recalls over two months is genuinely settled, and asking for it
 * weekly forever makes the daily load grow without bound until the student
 * gives up — which is the single most common way these systems fail.
 */
export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 16, 35, 90] as const;

export const MAX_BOX = REVIEW_INTERVALS_DAYS.length - 1;

export function toDateOnly(date: Date): DateOnly {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(date: DateOnly, days: number): DateOnly {
  const [year, month, day] = date.split("-").map(Number);
  // Constructed in local time and read back in local time, so the round trip
  // is stable regardless of timezone — which it would not be via Date.parse.
  const d = new Date(year, month - 1, day + days);
  return toDateOnly(d);
}

export function daysBetween(from: DateOnly, to: DateOnly): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const a = Date.UTC(fy, fm - 1, fd);
  const b = Date.UTC(ty, tm - 1, td);
  return Math.round((b - a) / 86_400_000);
}

/**
 * When this portion next needs reciting. A portion never reviewed is due the
 * day it was added — new hifz should be revised the same day, not tomorrow.
 */
export function dueDate(portion: TrackedPortion): DateOnly {
  if (portion.lastReviewed === null) return portion.addedOn;
  const interval = REVIEW_INTERVALS_DAYS[Math.min(portion.box, MAX_BOX)];
  return addDays(portion.lastReviewed, interval);
}

export function isDue(portion: TrackedPortion, on: DateOnly): boolean {
  return daysBetween(dueDate(portion), on) >= 0;
}

/** The day's revision, in Qur'anic order — see the note at the top of the file. */
export function dueOn(
  portions: readonly TrackedPortion[],
  on: DateOnly
): TrackedPortion[] {
  return portions
    .filter((portion) => isDue(portion, on))
    .sort((a, b) => a.surah - b.surah || a.fromAyah - b.fromAyah);
}

/**
 * Apply a grade. "Shaky" holds the box rather than advancing it: you did
 * recall it, so you have not lost ground, but you have not earned a longer
 * gap either.
 */
export function review(
  portion: TrackedPortion,
  grade: Grade,
  on: DateOnly
): TrackedPortion {
  const box =
    grade === "solid"
      ? Math.min(portion.box + 1, MAX_BOX)
      : grade === "shaky"
        ? portion.box
        : 0;

  return {
    ...portion,
    box,
    lastReviewed: on,
    lapses: grade === "lost" ? portion.lapses + 1 : portion.lapses,
  };
}

/**
 * How heavy tomorrow looks, and the days after. A student deciding whether to
 * take on a new surah this week deserves to see that they already have 180
 * ayahs due on Thursday — that is the number that should stop them, and no
 * scheduler shows it.
 */
export function upcomingLoad(
  portions: readonly TrackedPortion[],
  from: DateOnly,
  days: number
): { date: DateOnly; portions: number; ayahs: number }[] {
  const load: { date: DateOnly; portions: number; ayahs: number }[] = [];

  for (let offset = 0; offset < days; offset++) {
    const date = addDays(from, offset);

    // Each portion lands on exactly one day, so the chart is not cumulative —
    // a cumulative one would show today's backlog again on every future day
    // and tell the student nothing. The exception is overdue work: anything
    // whose due date has already passed is counted on the first day, because
    // that is the day it will actually be recited. Matching on the exact date
    // instead made a backlog vanish from the chart entirely, which is the one
    // case where seeing the load matters most.
    const onDate = portions.filter((portion) => {
      const due = dueDate(portion);
      return offset === 0 ? daysBetween(due, date) >= 0 : due === date;
    });
    load.push({
      date,
      portions: onDate.length,
      ayahs: onDate.reduce((sum, portion) => sum + ayahsIn(portion), 0),
    });
  }

  return load;
}
