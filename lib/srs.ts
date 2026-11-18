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
 * Days until the next review, by box: the "standard" ladder. The first few are
 * tight because fresh hifz decays fast; the tail is long because a portion
 * that has survived five correct recalls over two months is genuinely settled,
 * and asking for it weekly forever makes the daily load grow without bound
 * until the student gives up — which is the single most common way these
 * systems fail.
 *
 * It is one of several ladders a person can choose (see PRESETS). Everything
 * that takes a `ladder` argument defaults to this one.
 */
export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 16, 35, 90] as const;

export const MAX_BOX = REVIEW_INTERVALS_DAYS.length - 1;

/** Days between reviews, by stage. Strictly increasing; see `parseLadder`. */
export type Ladder = readonly number[];

export type PresetName = "gentle" | "standard" | "intensive";

/**
 * The ready-made ladders. These are usability judgements, not requirements:
 * nothing here is a religious ruling about how often to revise, and the app
 * should never suggest otherwise. "Intensive" is for stretches such as
 * Ramadan when someone is revising far more than usual; "gentle" is for a
 * lighter daily load.
 */
export const PRESETS: Readonly<Record<PresetName, Ladder>> = {
  gentle: [2, 5, 12, 30, 60, 120],
  standard: REVIEW_INTERVALS_DAYS,
  intensive: [1, 2, 4, 7, 14, 30],
};

export const PRESET_NAMES: readonly PresetName[] = ["gentle", "standard", "intensive"];

/** A custom ladder may have between 1 and this many stages, and no gap longer than MAX_GAP_DAYS. */
export const MAX_STAGES = 10;
export const MAX_GAP_DAYS = 365;

/**
 * Which ladder is in use. For `custom`, `days` holds the person's own list.
 * It is stored with the trail so that a ladder chosen once is still the
 * ladder next week.
 */
export type ScheduleSetting =
  | { readonly preset: PresetName }
  | { readonly preset: "custom"; readonly days: Ladder };

export const DEFAULT_SCHEDULE: ScheduleSetting = { preset: "standard" };

export type LadderProblem = "empty" | "too-many" | "not-a-whole-number" | "too-long" | "not-increasing";

export function describeLadderProblem(problem: LadderProblem): string {
  switch (problem) {
    case "empty":
      return "Enter at least one number of days.";
    case "too-many":
      return `Use at most ${MAX_STAGES} stages.`;
    case "not-a-whole-number":
      return "Use whole numbers of days, at least 1.";
    case "too-long":
      return `No gap can be longer than ${MAX_GAP_DAYS} days.`;
    case "not-increasing":
      return "Each stage must be longer than the one before.";
  }
}

/** Check a list of gaps. Strictly increasing, because a ladder whose gaps shrink as you climb it would ask for a settled portion more often than a new one. */
export function checkLadder(days: readonly number[]): LadderProblem | null {
  if (days.length === 0) return "empty";
  if (days.length > MAX_STAGES) return "too-many";
  if (days.some((d) => !Number.isInteger(d) || d < 1)) return "not-a-whole-number";
  if (days.some((d) => d > MAX_GAP_DAYS)) return "too-long";
  for (let i = 1; i < days.length; i++) if (days[i] <= days[i - 1]) return "not-increasing";
  return null;
}

/** Read "1, 3, 7, 16" (commas, spaces or both) into a ladder. */
export function parseLadder(text: string): { ok: true; ladder: Ladder } | { ok: false; problem: LadderProblem } {
  const parts = text.split(/[\s,]+/).filter((part) => part !== "");
  const days = parts.map((part) => (/^\d+$/.test(part) ? Number(part) : Number.NaN));
  const problem = checkLadder(days);
  return problem ? { ok: false, problem } : { ok: true, ladder: days };
}

export function ladderOf(setting: ScheduleSetting): Ladder {
  return setting.preset === "custom" ? setting.days : PRESETS[setting.preset];
}

/** Read a stored setting back, falling back to the standard ladder for anything unusable. */
export function parseSchedule(value: unknown): ScheduleSetting {
  if (typeof value !== "object" || value === null) return DEFAULT_SCHEDULE;
  const c = value as Record<string, unknown>;
  if (c.preset === "gentle" || c.preset === "standard" || c.preset === "intensive") return { preset: c.preset };
  if (c.preset === "custom" && Array.isArray(c.days) && checkLadder(c.days as number[]) === null) {
    return { preset: "custom", days: [...(c.days as number[])] };
  }
  return DEFAULT_SCHEDULE;
}

/**
 * The stage a portion is actually at on this ladder.
 *
 * A portion's stored `box` is not rewritten when the ladder changes, so a
 * portion at stage 6 of the standard ladder can meet a ladder with four
 * stages. It is treated as being at the last stage of the shorter ladder
 * (the longest gap on offer), and the stored number is untouched, so
 * switching back restores exactly where it was. Nothing is lost either way.
 */
export function effectiveBox(portion: { readonly box: number }, ladder: Ladder = REVIEW_INTERVALS_DAYS): number {
  return Math.max(0, Math.min(portion.box, ladder.length - 1));
}

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
export function dueDate(portion: TrackedPortion, ladder: Ladder = REVIEW_INTERVALS_DAYS): DateOnly {
  if (portion.lastReviewed === null) return portion.addedOn;
  return addDays(portion.lastReviewed, ladder[effectiveBox(portion, ladder)]);
}

export function isDue(portion: TrackedPortion, on: DateOnly, ladder: Ladder = REVIEW_INTERVALS_DAYS): boolean {
  return daysBetween(dueDate(portion, ladder), on) >= 0;
}

/** The day's revision, in Qur'anic order — see the note at the top of the file. */
export function dueOn(
  portions: readonly TrackedPortion[],
  on: DateOnly,
  ladder: Ladder = REVIEW_INTERVALS_DAYS
): TrackedPortion[] {
  return portions
    .filter((portion) => isDue(portion, on, ladder))
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
  on: DateOnly,
  ladder: Ladder = REVIEW_INTERVALS_DAYS
): TrackedPortion {
  const top = ladder.length - 1;
  const at = effectiveBox(portion, ladder);
  const box = grade === "solid" ? Math.min(at + 1, top) : grade === "shaky" ? at : 0;

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
  days: number,
  ladder: Ladder = REVIEW_INTERVALS_DAYS
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
      const due = dueDate(portion, ladder);
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
