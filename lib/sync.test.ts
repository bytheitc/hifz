import { describe, expect, it } from "vitest";
import { type RemoteTrail, type TrailTransport, describeSync, syncOwnTrail } from "./sync";
import { type AppState, addPortion, currentPortions, emptyState, recordGrade } from "./store";
import { trailOf } from "./halaqah";
import type { TrackedPortion } from "./srs";
import type { GradeEvent } from "./grading";

const TODAY = "2026-11-14";
const ACCOUNT = "account-subject-1";
const self = { kind: "self" } as const;

function portion(over: Partial<TrackedPortion> = {}): TrackedPortion {
  return {
    id: "p1",
    surah: 67,
    fromAyah: 1,
    toAyah: 30,
    box: 0,
    lastReviewed: null,
    addedOn: TODAY,
    lapses: 0,
    ...over,
  };
}

function grade(over: Partial<GradeEvent> = {}): GradeEvent {
  return {
    id: "e1",
    portionId: "p1",
    studentId: "whoever",
    grade: "solid",
    on: "2026-11-13",
    recordedAt: "2026-11-13T08:00:00.000Z",
    by: self,
    ...over,
  };
}

/** A server that remembers, with the same add-only and union rules the real
 *  one enforces, so the tests exercise the agreement rather than a stub that
 *  always says yes. */
function server(initial: Partial<RemoteTrail> = {}): TrailTransport & { held: RemoteTrail } {
  const held: RemoteTrail = {
    subjectId: ACCOUNT,
    portions: initial.portions ?? [],
    events: initial.events ?? [],
    ...initial,
  };

  return {
    held,
    async fetch() {
      return { ...held, portions: [...held.portions], events: [...held.events] };
    },
    async sendPortions(portions) {
      const known = new Set(held.portions.map((p) => p.id));
      const fresh = portions.filter((p) => !known.has(p.id));
      (held.portions as TrackedPortion[]).push(...fresh);
      return { added: fresh.length };
    },
    async sendEvents(events) {
      const known = new Set(held.events.map((e) => e.id));
      const fresh = events.filter((e) => !known.has(e.id));
      (held.events as GradeEvent[]).push(...fresh);
      return { added: fresh.length, alreadyHad: events.length - fresh.length };
    },
  };
}

function deviceWith(portions: TrackedPortion[] = []): AppState {
  return portions.reduce(
    (state, p) => addPortion(state, state.selfStudentId, p),
    emptyState(TODAY)
  );
}

describe("the first sync after signing in", () => {
  it("binds the device's trail to the account instead of refusing it", async () => {
    // The trail's subject id was minted on this device and the account's at
    // registration, so for the same person they always differ. Unbound, the
    // provenance guard reads the server's copy as somebody else's.
    const outcome = await syncOwnTrail(deviceWith([portion()]), server(), ACCOUNT);

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const trail = trailOf(outcome.state.trails, outcome.state.selfStudentId);
    expect(trail.subjectId).toBe(ACCOUNT);
    expect(trail.boundAccount).toBe(ACCOUNT);
  });

  it("sends up a trail the server has never seen", async () => {
    const remote = server();
    const outcome = await syncOwnTrail(deviceWith([portion()]), remote, ACCOUNT);

    expect(outcome.ok && outcome.sentUp.portions).toBe(1);
    expect(remote.held.portions).toHaveLength(1);
  });

  it("takes in a trail the device has never seen", async () => {
    const remote = server({
      portions: [portion({ id: "from-phone" })],
      // The grade has to point at the portion the server actually holds;
      // one that points elsewhere is an orphan and is dropped on purpose.
      events: [grade({ portionId: "from-phone" })],
    });
    const outcome = await syncOwnTrail(deviceWith(), remote, ACCOUNT);

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.tookIn.portions).toBe(1);
    expect(outcome.tookIn.grades).toBe(1);
    expect(currentPortions(outcome.state, outcome.state.selfStudentId)).toHaveLength(1);
  });
});

describe("two devices, one person", () => {
  it("leaves both holding everything", async () => {
    const remote = server({
      portions: [portion({ id: "laptop-p", surah: 36, toAyah: 40 })],
      events: [grade({ id: "laptop-e", portionId: "laptop-p" })],
    });

    let phone = deviceWith([portion({ id: "phone-p" })]);
    phone = recordGrade(phone, phone.selfStudentId, "phone-p", "solid", "2026-11-14", self);

    const outcome = await syncOwnTrail(phone, remote, ACCOUNT);

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    // The phone now holds both portions.
    expect(currentPortions(outcome.state, outcome.state.selfStudentId)).toHaveLength(2);
    // And so does the server.
    expect(remote.held.portions).toHaveLength(2);
    expect(remote.held.events).toHaveLength(2);
  });

  it("does not duplicate a portion both sides already had under different ids", async () => {
    // Ids are minted per device, so the same Al-Mulk is "p1" here and
    // something else there. Matching by id would hand the person two.
    const remote = server({ portions: [portion({ id: "minted-elsewhere" })] });
    const outcome = await syncOwnTrail(deviceWith([portion({ id: "minted-here" })]), remote, ACCOUNT);

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(currentPortions(outcome.state, outcome.state.selfStudentId)).toHaveLength(1);
  });

  it("changes nothing the second time", async () => {
    const remote = server();
    const first = await syncOwnTrail(deviceWith([portion()]), remote, ACCOUNT);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = await syncOwnTrail(first.state, remote, ACCOUNT);

    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.tookIn).toEqual({ portions: 0, grades: 0 });
    expect(second.sentUp).toEqual({ portions: 0, grades: 0 });
    expect(describeSync(second)).toBe("Already up to date.");
  });
});

describe("refusing", () => {
  it("will not sign a second account into a device that holds someone else's trail", async () => {
    const remote = server();
    const first = await syncOwnTrail(deviceWith([portion()]), remote, ACCOUNT);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const other = await syncOwnTrail(first.state, server(), "a-different-account");

    expect(other.ok).toBe(false);
    if (other.ok) return;
    expect(other.reason).toBe("other-account");
  });

  it("refuses a server that answers with a different person's record", async () => {
    const wrong = server();
    (wrong.held as { subjectId: string }).subjectId = "somebody-else";

    const outcome = await syncOwnTrail(deviceWith([portion()]), wrong, ACCOUNT);

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toBe("other-account");
  });
});

describe("when the network gives out", () => {
  it("changes nothing if the pull fails", async () => {
    const dead: TrailTransport = {
      async fetch() {
        throw new Error("offline");
      },
      async sendPortions() {
        throw new Error("offline");
      },
      async sendEvents() {
        throw new Error("offline");
      },
    };

    const outcome = await syncOwnTrail(deviceWith([portion()]), dead, ACCOUNT);

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toBe("unreachable");
  });

  it("keeps what it pulled when only the push fails", async () => {
    // The device is strictly better off than before: it has the server's
    // work and simply has not sent its own. Throwing that away because the
    // second half failed would be the wrong kind of tidy.
    const remote = server({ portions: [portion({ id: "theirs" })] });
    const halfDead: TrailTransport = {
      fetch: remote.fetch,
      async sendPortions() {
        throw new Error("offline");
      },
      sendEvents: remote.sendEvents,
    };

    const outcome = await syncOwnTrail(deviceWith(), halfDead, ACCOUNT);

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.message).toContain("Took in what the server had");
  });
});

describe("what it says afterwards", () => {
  it("counts both directions", async () => {
    const remote = server({ portions: [portion({ id: "theirs", surah: 36, toAyah: 40 })] });
    const outcome = await syncOwnTrail(deviceWith([portion({ id: "mine" })]), remote, ACCOUNT);

    expect(describeSync(outcome)).toBe("Took in 1 portion · sent up 1 portion.");
  });

  it("says plainly when there was nothing to do", async () => {
    const outcome = await syncOwnTrail(deviceWith(), server(), ACCOUNT);
    expect(describeSync(outcome)).toBe("Already up to date.");
  });
});
