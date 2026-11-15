import { ayahsIn } from "./quran";
import {
  MAX_BOX,
  type DateOnly,
  type TrackedPortion,
  daysBetween,
  dueDate,
  isDue,
} from "./srs";

/**
 * Which portion is actually giving this person trouble.
 *
 * The app already had `needsRelearning`, which asks one question: has this
 * lapsed three times or more. That is a useful alarm and a poor ranking. It
 * cannot tell the difference between:
 *
 *   - Ya-Sin 1-40, lost three times in the last two months, still sitting in
 *     box 0, and
 *   - Al-Mulk, lost three times across three years, now in box 5 and solid
 *     for the last ninety days.
 *
 * The first is the thing a student should be told about the moment they open
 * their phone. The second is history. A score that cannot separate them will
 * eventually point at the wrong surah, and a coach built on top of it will
 * confidently nag about something that is already fixed.
 *
 * So the score combines three honest signals, all of them already in the
 * data and none of them requiring new tracking:
 *
 *   lapses   - how many times it has actually gone. The core of it.
 *   rate     - those lapses per month of being tracked. Three lapses in two
 *              months is a struggle; three across four years is a life.
 *   recovery - the current box. A portion that has climbed back to a long
 *              interval has demonstrably recovered, whatever its past, and
 *              should fall down the list rather than be named forever.
 */

/** Box at which a portion has survived long enough to count as recovered.
 *  Box 3 is a sixteen-day interval, which is the first gap long enough that
 *  surviving it is evidence rather than luck. */
export const SETTLED_BOX = 3;

/** Below this, the struggle is not worth naming on the front page. One lapse
 *  a year ago is not a trouble spot, and calling it one teaches the student
 *  to ignore the section. */
export const TROUBLE_THRESHOLD = 2;

export interface TroubleSpot {
  readonly portion: TrackedPortion;
  /** Higher is worse. Unbounded, and only ever compared against other
   *  scores - there is no meaning to "a score of 7" on its own. */
  readonly score: number;
  /** Lapses per month of being tracked, for display. */
  readonly lapsesPerMonth: number;
  /** True once the portion has climbed back to a long interval. Still listed,
   *  because the history is real, but ranked below anything still falling. */
  readonly recovered: boolean;
  /** Whether it is in today's queue. The coach needs this: naming a problem
   *  the student cannot act on today is nagging rather than help. */
  readonly dueToday: boolean;
  /** Plain sentences explaining the ranking, for the interface and the coach.
   *  The score is a number nobody should be asked to trust on faith. */
  readonly reasons: readonly string[];
}

export function troubleScore(portion: TrackedPortion, today: DateOnly): number {
  if (portion.lapses === 0) return 0;

  // Guard the denominator: a portion added today has been tracked for zero
  // days, and dividing by that would rank a brand-new lapse as infinitely
  // urgent. One month is the floor.
  const months = Math.max(1, daysBetween(portion.addedOn, today) / 30);
  const rate = portion.lapses / months;

  // 0 when the portion is back at a one-day interval, 1 at the top box.
  const recovery = Math.min(portion.box, MAX_BOX) / MAX_BOX;

  // The rate is multiplied up because it is the signal that distinguishes an
  // active problem from an old one, and raw lapses alone drown it out.
  // Recovery never cancels a score completely - a portion that has gone five
  // times is worth a glance even now - so the discount stops at three
  // quarters rather than all of it.
  return (portion.lapses + rate * 3) * (1 - 0.75 * recovery);
}

function reasonsFor(
  portion: TrackedPortion,
  today: DateOnly,
  lapsesPerMonth: number,
  recovered: boolean
): string[] {
  const reasons: string[] = [];

  reasons.push(
    `lost ${portion.lapses} time${portion.lapses === 1 ? "" : "s"} since you added it`
  );

  if (lapsesPerMonth >= 1) {
    reasons.push("going roughly once a month or more");
  }

  if (recovered) {
    reasons.push("but it has held steady recently");
  } else if (portion.box === 0) {
    reasons.push("back at a one-day interval");
  }

  const overdue = daysBetween(dueDate(portion), today);
  if (overdue > 0) {
    reasons.push(`${overdue} day${overdue === 1 ? "" : "s"} overdue`);
  }

  return reasons;
}

/**
 * Every portion that has ever lapsed, worst first. Callers that want the
 * front-page list should use `troubleSpots`, which applies the threshold.
 */
export function rankByTrouble(
  portions: readonly TrackedPortion[],
  today: DateOnly
): TroubleSpot[] {
  return portions
    .filter((portion) => portion.lapses > 0)
    .map((portion) => {
      const months = Math.max(1, daysBetween(portion.addedOn, today) / 30);
      const lapsesPerMonth = portion.lapses / months;
      const recovered = portion.box >= SETTLED_BOX;
      return {
        portion,
        score: troubleScore(portion, today),
        lapsesPerMonth,
        recovered,
        dueToday: isDue(portion, today),
        reasons: reasonsFor(portion, today, lapsesPerMonth, recovered),
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        // Ties broken in Qur'anic order, for the same reason the due queue is:
        // a list that reshuffles itself between renders is hard to trust.
        a.portion.surah - b.portion.surah ||
        a.portion.fromAyah - b.portion.fromAyah
    );
}

export function troubleSpots(
  portions: readonly TrackedPortion[],
  today: DateOnly,
  limit = 3
): TroubleSpot[] {
  return rankByTrouble(portions, today)
    .filter((spot) => spot.score >= TROUBLE_THRESHOLD)
    .slice(0, limit);
}

/** The single portion to lead with on a phone, where there is room for one
 *  thing and it had better be the right one. Null when nothing qualifies. */
export function worstTroubleSpot(
  portions: readonly TrackedPortion[],
  today: DateOnly
): TroubleSpot | null {
  return troubleSpots(portions, today, 1)[0] ?? null;
}

/** Ayahs carried by the portions currently in trouble - used by the coach to
 *  say something more useful than "you have three problems". */
export function troubleWeight(spots: readonly TroubleSpot[]): number {
  return spots.reduce((sum, spot) => sum + ayahsIn(spot.portion), 0);
}
