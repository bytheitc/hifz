import { describe, expect, it } from "vitest";
import { type CoachMood, type CoachSituation, coach, moodFor } from "./coach";
import type { TrackedPortion } from "./srs";
import type { TroubleSpot } from "./trouble";

const EMOJI = /(\p{Extended_Pictographic}|\p{Regional_Indicator})/u;

function situation(over: Partial<CoachSituation> = {}): CoachSituation {
  return {
    today: "2026-11-11",
    trailSize: 4,
    dueCount: 2,
    dueAyahs: 40,
    gradedToday: 0,
    percent: 3.2,
    worstSpot: null,
    heaviestAhead: null,
    ...over,
  };
}

function spot(over: Partial<TrackedPortion> = {}, dueToday = true): TroubleSpot {
  const portion: TrackedPortion = {
    id: "t",
    surah: 36,
    fromAyah: 1,
    toAyah: 40,
    box: 0,
    lastReviewed: "2026-11-01",
    addedOn: "2026-08-01",
    lapses: 3,
    ...over,
  };
  return {
    portion,
    score: 9,
    lapsesPerMonth: 1,
    recovered: false,
    dueToday,
    reasons: ["lost 3 times since you added it"],
  };
}

const ALL_MOODS: CoachMood[] = [
  "empty",
  "allClear",
  "finished",
  "trouble",
  "heavy",
  "working",
  "ready",
];

const SITUATIONS: Record<CoachMood, CoachSituation> = {
  empty: situation({ trailSize: 0, dueCount: 0, dueAyahs: 0 }),
  allClear: situation({ dueCount: 0, dueAyahs: 0 }),
  finished: situation({ dueCount: 0, dueAyahs: 0, gradedToday: 3 }),
  trouble: situation({ worstSpot: spot() }),
  heavy: situation({
    dueCount: 9,
    dueAyahs: 240,
    heaviestAhead: { date: "2026-11-13", ayahs: 310 },
  }),
  working: situation({ gradedToday: 2, dueCount: 3 }),
  ready: situation(),
};

describe("moodFor", () => {
  it("picks the mood each situation was built for", () => {
    for (const mood of ALL_MOODS) {
      expect(moodFor(SITUATIONS[mood])).toBe(mood);
    }
  });

  it("puts an empty trail ahead of everything else", () => {
    expect(moodFor(situation({ trailSize: 0, dueCount: 5, dueAyahs: 300 }))).toBe(
      "empty"
    );
  });

  it("ranks a trouble spot above a merely heavy day", () => {
    expect(
      moodFor(situation({ worstSpot: spot(), dueAyahs: 400, dueCount: 12 }))
    ).toBe("trouble");
  });

  it("stays quiet about a trouble spot that is not due today", () => {
    // Naming a problem the student cannot act on today is nagging.
    const quiet = situation({ worstSpot: spot({}, false), dueAyahs: 300 });
    expect(moodFor(quiet)).toBe("heavy");
  });

  it("distinguishes a finished day from one that was always clear", () => {
    expect(moodFor(situation({ dueCount: 0, gradedToday: 0 }))).toBe("allClear");
    expect(moodFor(situation({ dueCount: 0, gradedToday: 4 }))).toBe("finished");
  });
});

describe("coach", () => {
  it("produces a line for every mood", () => {
    for (const mood of ALL_MOODS) {
      const said = coach(SITUATIONS[mood]);
      expect(said.mood).toBe(mood);
      expect(said.line.trim().length).toBeGreaterThan(0);
      expect(said.greeting.trim().length).toBeGreaterThan(0);
    }
  });

  it("says the same thing all day for the same situation", () => {
    // A coach that re-rolls on every render is a slot machine.
    const first = coach(SITUATIONS.ready);
    for (let i = 0; i < 20; i++) {
      expect(coach(SITUATIONS.ready)).toEqual(first);
    }
  });

  it("does not repeat itself forever", () => {
    const lines = new Set<string>();
    for (const day of ["2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15", "2026-11-16"]) {
      lines.add(coach({ ...SITUATIONS.ready, today: day }).line);
    }
    expect(lines.size).toBeGreaterThan(1);
  });

  it("names the actual portion when there is a trouble spot", () => {
    const said = coach(SITUATIONS.trouble);
    expect(said.line).toContain("Ya-Sin");
    expect(said.nudge).toContain("Ya-Sin");
  });

  it("gets singular and plural right for a single lapse", () => {
    // Checked across days because each trouble line splices the count in
    // differently, and one of them capitalises it.
    for (const day of ["2026-01-01", "2026-11-11", "2027-05-05", "2027-09-09"]) {
      const said = coach({ ...situation({ worstSpot: spot({ lapses: 1 }) }), today: day });
      expect(said.line.toLowerCase()).toContain("lost 1 time");
      expect(said.line).not.toContain("1 times");
    }
  });

  it("leaves no unfilled placeholder in any line", () => {
    for (const mood of ALL_MOODS) {
      for (const day of ["2026-01-01", "2026-06-15", "2026-11-11", "2027-03-09"]) {
        const said = coach({ ...SITUATIONS[mood], today: day });
        expect(said.line).not.toMatch(/\{|\}|undefined|NaN/);
        expect(said.nudge ?? "").not.toMatch(/\{|\}|undefined|NaN/);
      }
    }
  });

  it("starts every sentence with a capital letter", () => {
    // The trouble lines splice a generated clause in after a full stop, and
    // the first version of them shipped "undoing you. lost 3 times".
    for (const mood of ALL_MOODS) {
      for (const day of ["2026-01-01", "2026-04-04", "2026-11-11", "2027-08-08"]) {
        const said = coach({ ...SITUATIONS[mood], today: day });
        for (const sentence of said.line.split(/(?<=\.)\s+/)) {
          const first = sentence.trim().charAt(0);
          if (first && /[a-z]/.test(first)) {
            throw new Error(`lower-case sentence in ${mood}: "${sentence}"`);
          }
        }
      }
    }
  });

  it("uses no emojis, because warmth has to be carried by the words", () => {
    for (const mood of ALL_MOODS) {
      for (const day of ["2026-01-01", "2026-07-07", "2026-11-11"]) {
        const said = coach({ ...SITUATIONS[mood], today: day });
        expect(said.line).not.toMatch(EMOJI);
        expect(said.greeting).not.toMatch(EMOJI);
        expect(said.nudge ?? "").not.toMatch(EMOJI);
      }
    }
  });

  it("never congratulates someone whose schedule is collapsing", () => {
    const praise = /well done|amazing|great job|fantastic|brilliant|proud of you/i;
    for (const day of ["2026-01-01", "2026-05-05", "2026-11-11", "2027-02-02"]) {
      for (const mood of ["trouble", "heavy"] as const) {
        const said = coach({ ...SITUATIONS[mood], today: day });
        expect(`${said.line} ${said.nudge ?? ""}`).not.toMatch(praise);
      }
    }
  });

  it("offers something to do whenever there is work waiting", () => {
    for (const mood of ["trouble", "heavy", "working", "ready", "empty"] as const) {
      expect(coach(SITUATIONS[mood]).nudge).toBeTruthy();
    }
  });

  it("does not invent work on a clear day", () => {
    expect(coach(SITUATIONS.allClear).nudge).toBeNull();
    expect(coach(SITUATIONS.finished).nudge).toBeNull();
  });

  it("falls back gracefully if a heavy day has no standout", () => {
    const said = coach(situation({ dueCount: 9, dueAyahs: 240, heaviestAhead: null }));
    expect(said.line).not.toMatch(/undefined|null/);
  });
});
