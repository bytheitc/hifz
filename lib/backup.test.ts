import { describe, expect, it } from "vitest";
import type { TrackedPortion } from "./srs";
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  type Backup,
  backupFilename,
  buildBackup,
  describeMerge,
  describeProblem,
  mergeBackup,
  readBackup,
} from "./backup";

const TODAY = "2026-11-12";

function portion(over: Partial<TrackedPortion> = {}): TrackedPortion {
  return {
    id: "p",
    surah: 67,
    fromAyah: 1,
    toAyah: 30,
    box: 2,
    lastReviewed: "2026-10-20",
    addedOn: "2026-02-10",
    lapses: 1,
    ...over,
  };
}

function fileOf(portions: readonly TrackedPortion[]): string {
  return JSON.stringify(buildBackup(portions, TODAY));
}

function asBackup(value: Backup | { kind: string }): Backup {
  if ("kind" in value) throw new Error(`expected a backup, got ${value.kind}`);
  return value;
}

describe("a round trip", () => {
  it("brings every portion back unchanged", () => {
    const trail = [portion({ id: "a" }), portion({ id: "b", surah: 36, toAyah: 40 })];
    const read = asBackup(readBackup(fileOf(trail)));
    expect(read.portions).toEqual(trail);
  });

  it("restores a whole trail into an empty one", () => {
    const trail = [portion({ id: "a" }), portion({ id: "b", surah: 1, toAyah: 7 })];
    const read = asBackup(readBackup(fileOf(trail)));
    const merged = mergeBackup([], read.portions);
    expect(merged.portions).toEqual(trail);
    expect(merged.added).toBe(2);
  });

  it("names the file by date, so two backups can be told apart", () => {
    expect(backupFilename(TODAY)).toBe("hifz-trail-2026-11-12.json");
  });

  it("writes a format tag and a version", () => {
    const built = buildBackup([portion()], TODAY);
    expect(built.format).toBe(BACKUP_FORMAT);
    expect(built.version).toBe(BACKUP_VERSION);
    expect(built.exportedOn).toBe(TODAY);
  });
});

describe("refusing a file that is not a backup", () => {
  it("rejects text that is not JSON", () => {
    expect(readBackup("not a file")).toEqual({ kind: "not-json" });
  });

  it("rejects JSON that is not a backup envelope", () => {
    expect(readBackup('{"hello":"world"}')).toEqual({ kind: "not-a-backup" });
  });

  it("rejects a bare array, which an earlier draft might have written", () => {
    expect(readBackup(JSON.stringify([portion()]))).toEqual({ kind: "not-a-backup" });
  });

  it("rejects an envelope with no portions", () => {
    const text = JSON.stringify({ format: BACKUP_FORMAT, version: 1 });
    expect(readBackup(text)).toEqual({ kind: "not-a-backup" });
  });

  it("refuses a backup from a newer version rather than truncating it", () => {
    const text = JSON.stringify({
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION + 1,
      exportedOn: TODAY,
      portions: [],
    });
    expect(readBackup(text)).toEqual({
      kind: "newer-version",
      version: BACKUP_VERSION + 1,
    });
  });

  it("has a sentence for every problem", () => {
    expect(describeProblem({ kind: "not-json" })).toMatch(/could not be read/i);
    expect(describeProblem({ kind: "not-a-backup" })).toMatch(/nothing was changed/i);
    expect(describeProblem({ kind: "newer-version", version: 2 })).toMatch(/newer/i);
  });
});

describe("dropping portions that would render as nonsense", () => {
  function withPortions(portions: unknown[]): string {
    return JSON.stringify({
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedOn: TODAY,
      portions,
    });
  }

  it("keeps the good ones and drops the rest", () => {
    const read = asBackup(
      readBackup(withPortions([portion({ id: "good" }), { id: "bad" }, null, 7]))
    );
    expect(read.portions.map((p) => p.id)).toEqual(["good"]);
  });

  it("drops a portion outside its surah, as the add form would have", () => {
    // Al-Mulk has 30 ayahs.
    const read = asBackup(readBackup(withPortions([portion({ toAyah: 99 })])));
    expect(read.portions).toHaveLength(0);
  });

  it("drops a surah that does not exist", () => {
    const read = asBackup(readBackup(withPortions([portion({ surah: 200 })])));
    expect(read.portions).toHaveLength(0);
  });

  it("drops a box outside the interval table", () => {
    const read = asBackup(readBackup(withPortions([portion({ box: 99 })])));
    expect(read.portions).toHaveLength(0);
  });

  it("drops a negative lapse count", () => {
    const read = asBackup(readBackup(withPortions([portion({ lapses: -1 })])));
    expect(read.portions).toHaveLength(0);
  });

  it("drops a malformed date", () => {
    const read = asBackup(readBackup(withPortions([portion({ addedOn: "last tuesday" })])));
    expect(read.portions).toHaveLength(0);
  });

  it("keeps a portion that has never been reviewed", () => {
    const read = asBackup(readBackup(withPortions([portion({ lastReviewed: null })])));
    expect(read.portions).toHaveLength(1);
  });
});

describe("merging into a trail that already has work in it", () => {
  it("never changes a portion the student already has", () => {
    const mine = portion({ id: "mine", box: 4, lapses: 0, lastReviewed: "2026-11-01" });
    const theirs = portion({ id: "theirs", box: 0, lapses: 9, lastReviewed: null });
    const merged = mergeBackup([mine], [theirs]);
    expect(merged.portions).toEqual([mine]);
    expect(merged.added).toBe(0);
    expect(merged.alreadyHad).toBe(1);
  });

  it("matches on the portion, not the id, so a second device does not duplicate", () => {
    const onPhone = portion({ id: "phone-1" });
    const onLaptop = portion({ id: "laptop-9" });
    const merged = mergeBackup([onPhone], [onLaptop]);
    expect(merged.portions).toHaveLength(1);
    expect(merged.added).toBe(0);
  });

  it("treats a different range of the same surah as a different portion", () => {
    const first = portion({ id: "a", surah: 36, fromAyah: 1, toAyah: 40 });
    const second = portion({ id: "b", surah: 36, fromAyah: 41, toAyah: 83 });
    const merged = mergeBackup([first], [second]);
    expect(merged.portions).toHaveLength(2);
    expect(merged.added).toBe(1);
  });

  it("re-keys an incoming portion whose id collides with a different portion", () => {
    const mine = portion({ id: "same", surah: 1, fromAyah: 1, toAyah: 7 });
    const theirs = portion({ id: "same", surah: 36, fromAyah: 1, toAyah: 40 });
    const merged = mergeBackup([mine], [theirs]);
    expect(merged.portions).toHaveLength(2);
    const ids = merged.portions.map((p) => p.id);
    expect(new Set(ids).size).toBe(2);
    expect(ids).toContain("same");
  });

  it("restores a file faithfully, including a range tracked twice", () => {
    // The add form lets a student track the same range more than once, so a
    // file holding it twice is a true record of their trail. Restoring has to
    // give back what was saved rather than quietly tidying it up.
    const merged = mergeBackup([], [portion({ id: "a" }), portion({ id: "b" })]);
    expect(merged.portions).toHaveLength(2);
    expect(merged.added).toBe(2);
  });

  it("round-trips a whole trail into an empty app with nothing lost", () => {
    // The case that caught this: a trail holding An-Nas three times exported
    // seven portions and restored five.
    const trail = [
      portion({ id: "a", surah: 114, fromAyah: 1, toAyah: 6 }),
      portion({ id: "b", surah: 114, fromAyah: 1, toAyah: 6 }),
      portion({ id: "c", surah: 114, fromAyah: 1, toAyah: 6 }),
      portion({ id: "d", surah: 36, fromAyah: 1, toAyah: 40 }),
    ];
    const merged = mergeBackup([], asBackup(readBackup(fileOf(trail))).portions);
    expect(merged.portions).toEqual(trail);
    expect(merged.added).toBe(trail.length);
  });

  it("still skips a range the student already tracks, however often the file repeats it", () => {
    const mine = portion({ id: "mine", surah: 114, fromAyah: 1, toAyah: 6 });
    const file = [
      portion({ id: "x", surah: 114, fromAyah: 1, toAyah: 6 }),
      portion({ id: "y", surah: 114, fromAyah: 1, toAyah: 6 }),
    ];
    const merged = mergeBackup([mine], file);
    expect(merged.portions).toEqual([mine]);
    expect(merged.added).toBe(0);
    expect(merged.alreadyHad).toBe(2);
  });

  it("leaves the current trail untouched as an object", () => {
    const current = [portion({ id: "a" })];
    const before = JSON.stringify(current);
    mergeBackup(current, [portion({ id: "b", surah: 1, toAyah: 7 })]);
    expect(JSON.stringify(current)).toBe(before);
  });
});

describe("what the student is told afterwards", () => {
  it("counts what was added", () => {
    expect(describeMerge({ portions: [], added: 3, alreadyHad: 0 }, 0)).toBe(
      "Added 3 portions."
    );
  });

  it("uses the singular for one", () => {
    expect(describeMerge({ portions: [], added: 1, alreadyHad: 0 }, 0)).toBe(
      "Added 1 portion."
    );
  });

  it("says plainly when a file added nothing", () => {
    const said = describeMerge({ portions: [], added: 0, alreadyHad: 4 }, 0);
    expect(said).toMatch(/nothing new/i);
    expect(said).toMatch(/4 already/);
  });

  it("admits when some of the file could not be read", () => {
    expect(describeMerge({ portions: [], added: 2, alreadyHad: 0 }, 3)).toMatch(
      /3 unreadable/
    );
  });

  it("never claims a count it does not have", () => {
    expect(describeMerge({ portions: [], added: 2, alreadyHad: 0 }, 0)).toBe(
      "Added 2 portions."
    );
  });
});
