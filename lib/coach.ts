import { describePortion } from "./quran";
import type { DateOnly } from "./srs";
import type { TroubleSpot } from "./trouble";

/**
 * The voice of the app.
 *
 * This is the "AI" in Hifz Trail, and it is worth being exact about what that
 * means, because the word usually implies a server and a key and a body of
 * text leaving the device. Nothing here does any of that. The coach is a pure
 * function from the student's own numbers to a sentence, which buys three
 * things a language model would have cost us:
 *
 *   1. It works on a plane, in a masjid basement, and on the day the API is
 *      down - which is to say, every day the student actually needs it.
 *   2. It cannot invent a surah, misremember a count, or encourage someone
 *      about progress they have not made. Every line is derived from a number
 *      on the page, so the coach is incapable of flattery.
 *   3. It is testable. A model that is charming nine times in ten and
 *      tactless the tenth is not something to ship between a person and their
 *      hifz.
 *
 * What it must never be is a cheerleader. The app's whole argument is that
 * honest numbers beat encouraging ones, and a coach that says "amazing work"
 * over a collapsing revision schedule would undo the rest of it. The register
 * is a friend who knows the subject: dry, warm, occasionally funny, and
 * willing to say the unwelcome thing first.
 *
 * There are no emojis here, and that is a repository rule rather than an
 * oversight (see `scripts/check-no-emojis.mjs`). Warmth has to be carried by
 * the words.
 */

export type CoachMood =
  | "empty"
  | "allClear"
  | "finished"
  | "trouble"
  | "heavy"
  | "working"
  | "ready";

export interface CoachSituation {
  readonly today: DateOnly;
  /** How many portions are tracked at all. */
  readonly trailSize: number;
  readonly dueCount: number;
  readonly dueAyahs: number;
  /** Of today's due portions, how many have already been graded today. */
  readonly gradedToday: number;
  readonly percent: number;
  readonly worstSpot: TroubleSpot | null;
  /** The heaviest of the coming six days, if one stands out. */
  readonly heaviestAhead: { readonly date: DateOnly; readonly ayahs: number } | null;
}

export interface CoachLine {
  readonly mood: CoachMood;
  /** Two or three words. Varies by day so the page is not identical forever. */
  readonly greeting: string;
  /** The substance. Always derived from a number the student can see. */
  readonly line: string;
  /** What to do about it, when there is something to do. */
  readonly nudge: string | null;
}

/** A day counts as heavy once it is more than this many ayahs. Chosen
 *  because it is roughly a long sitting rather than a quick run-through -
 *  the point at which a student should know in advance. */
export const HEAVY_DAY_AYAHS = 100;

type Writer = (situation: CoachSituation) => string;

/**
 * Lines are functions of the situation rather than templates with holes in
 * them. A template would eventually ship with an unfilled placeholder in it;
 * a function that forgets its argument simply reads oddly and is caught by a
 * test. Each mood carries several so the app does not develop a catchphrase.
 */
const LINES: Record<CoachMood, readonly Writer[]> = {
  empty: [
    () => "Nothing on the trail yet. An empty page is an honest place to start.",
    () => "No portions tracked. Add the first one and the schedule builds itself around it.",
    () => "Blank slate. Pick something short and let the dates take care of themselves.",
  ],

  allClear: [
    (s) =>
      `Nothing due. You are carrying ${s.percent.toFixed(1)} per cent of the book and none of it is asking for you today.`,
    () => "Clear day. The schedule has no claim on you, which is a thing worth noticing.",
    () => "Nothing due today. Rest is part of the method, not a gap in it.",
  ],

  finished: [
    (s) =>
      `All ${s.gradedToday} done. The rest of today is yours and the schedule has nothing to add.`,
    () => "Queue is empty. That is the whole of today's revision, closed properly.",
    (s) =>
      `${s.gradedToday} portion${s.gradedToday === 1 ? "" : "s"} graded, nothing left. Quietly, that is how hifz survives.`,
  ],

  trouble: [
    (s) =>
      `${spotName(s)} is the one quietly undoing you. ${capitalise(lapseCount(s))}, and it is in today's queue.`,
    (s) =>
      `Start with ${spotName(s)}. It has gone ${lapseCount(s)} and it will go again if it is left to the end of the list.`,
    (s) =>
      `${spotName(s)} keeps slipping. ${capitalise(lapseCount(s))} so far, which is the kind of pattern that does not fix itself.`,
  ],

  heavy: [
    (s) =>
      `${s.dueAyahs} ayahs due, and ${heavyDate(s)} is heavier still. Worth not adding anything new this week.`,
    (s) =>
      `A big one: ${s.dueAyahs} ayahs today. ${capitalise(heavyDate(s))} is the day to plan around.`,
    (s) =>
      `${s.dueCount} portions, ${s.dueAyahs} ayahs. Long sitting. Begin at the top and do not negotiate with the order.`,
  ],

  working: [
    (s) =>
      `${s.gradedToday} down, ${s.dueCount} to go. The order is the mushaf's, not mine.`,
    (s) => `${s.dueCount} left in the queue. You are past the hard part, which is starting.`,
    (s) =>
      `Still ${s.dueCount} waiting. No rush, but they do not carry over kindly.`,
  ],

  ready: [
    (s) =>
      `${s.dueCount} portion${s.dueCount === 1 ? "" : "s"} due, ${s.dueAyahs} ayahs. A reasonable day.`,
    (s) => `${s.dueAyahs} ayahs on the list. Short enough to finish before you talk yourself out of it.`,
    (s) =>
      `${s.dueCount} due. Top of the list first - it is in Qur'anic order for a reason.`,
  ],
};

const GREETINGS: readonly string[] = [
  "Back again",
  "Right then",
  "Here we are",
  "Good to see you",
  "Morning, more or less",
  "Let us see",
];

const NUDGES: Partial<Record<CoachMood, Writer>> = {
  empty: () => "Add a portion below.",
  trouble: (s) => `Recite ${spotName(s)} first, and slowly.`,
  heavy: () => "Check the seven-day view before taking on anything new.",
  working: () => "Keep going down the list.",
  ready: () => "Start at the top.",
};

function spotName(situation: CoachSituation): string {
  return situation.worstSpot
    ? describePortion(situation.worstSpot.portion)
    : "that portion";
}

function lapseCount(situation: CoachSituation): string {
  const lapses = situation.worstSpot?.portion.lapses ?? 0;
  return `lost ${lapses} time${lapses === 1 ? "" : "s"}`;
}

function heavyDate(situation: CoachSituation): string {
  return situation.heaviestAhead
    ? `${situation.heaviestAhead.date.slice(5)} (${situation.heaviestAhead.ayahs} ayahs)`
    : "later this week";
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function moodFor(situation: CoachSituation): CoachMood {
  if (situation.trailSize === 0) return "empty";
  if (situation.dueCount === 0) {
    return situation.gradedToday > 0 ? "finished" : "allClear";
  }
  // The trouble spot outranks everything else that is merely large, because
  // a heavy day is a scheduling problem and a portion that keeps going is a
  // memorisation one. Only fires when the spot is actually in today's queue -
  // telling someone about a problem they cannot act on today is nagging.
  if (situation.worstSpot && situation.worstSpot.dueToday) return "trouble";
  if (situation.dueAyahs > HEAVY_DAY_AYAHS) return "heavy";
  if (situation.gradedToday > 0) return "working";
  return "ready";
}

/**
 * A small, stable hash. The line has to be the same every time the component
 * re-renders - a coach that says something different on each keystroke is a
 * slot machine - but different tomorrow. Seeding on the date plus the mood
 * gives exactly that, with no state to store.
 */
function hash(seed: string): number {
  let value = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    value ^= seed.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function pick<T>(options: readonly T[], seed: string): T {
  return options[hash(seed) % options.length];
}

export function coach(situation: CoachSituation): CoachLine {
  const mood = moodFor(situation);
  const writer = pick(LINES[mood], `${situation.today}:${mood}`);
  const nudge = NUDGES[mood];

  return {
    mood,
    greeting: pick(GREETINGS, `${situation.today}:greeting`),
    line: writer(situation),
    nudge: nudge ? nudge(situation) : null,
  };
}
