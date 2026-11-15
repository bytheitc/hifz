import type { TrackedPortion } from "./srs";
import type { GradeEvent } from "./grading";
import { trailOf } from "./halaqah";
import { type AppState, bindAccount, takeInTrail } from "./store";

/**
 * Carrying one person's trail between their devices.
 *
 * There is no merge algorithm here worth the name, and that is the point.
 * Both halves were already built and tested for files moving by hand:
 * portions are matched by range because ids are minted per device, and
 * grades union by their own id because they are never edited. Sync is those
 * same two rules pointed at a server instead of a file, so a phone that has
 * been offline for a week needs no reconciliation when it comes back - it
 * sends what it has and takes what it lacks.
 *
 * Only the signed-in person's own trail. A teacher's register lives on their
 * device and moves by file; putting other people's children on a server is a
 * different decision with consent and retention attached to it, and it is
 * not made here by accident.
 */

export interface RemoteTrail {
  readonly subjectId: string;
  readonly portions: readonly TrackedPortion[];
  readonly events: readonly GradeEvent[];
}

/** What sync needs from the outside world. An interface rather than the api
 *  client itself, so the rules below can be tested without a server. */
export interface TrailTransport {
  fetch(): Promise<RemoteTrail>;
  sendPortions(
    portions: readonly TrackedPortion[]
  ): Promise<{ added: number }>;
  sendEvents(
    events: readonly GradeEvent[]
  ): Promise<{ added: number; alreadyHad: number }>;
}

export interface SyncCounts {
  readonly portions: number;
  readonly grades: number;
}

export type SyncOutcome =
  | {
      readonly ok: true;
      readonly state: AppState;
      readonly tookIn: SyncCounts;
      readonly sentUp: SyncCounts;
    }
  | {
      readonly ok: false;
      readonly reason: "other-account" | "unreachable";
      readonly message: string;
    };

/**
 * Pull, merge, push - in that order.
 *
 * Pulling first means the local copy is complete before anything leaves, so
 * a sync interrupted halfway has taken work in rather than half-sent it. The
 * push then carries everything, including what was just pulled, because the
 * server is idempotent on both halves: portions it already has are skipped
 * by id, grades by their unique index. Sending more than strictly necessary
 * costs a little bandwidth and removes a whole class of bug about what was
 * already up there.
 */
export async function syncOwnTrail(
  state: AppState,
  transport: TrailTransport,
  accountSubjectId: string
): Promise<SyncOutcome> {
  const bound = bindAccount(state, accountSubjectId);
  if (!bound.ok) {
    return {
      ok: false,
      reason: "other-account",
      message:
        "This device already holds a trail belonging to another account. Nothing was changed.",
    };
  }

  let remote: RemoteTrail;
  try {
    remote = await transport.fetch();
  } catch {
    return {
      ok: false,
      reason: "unreachable",
      message: "Could not reach the server. Nothing was changed.",
    };
  }

  const taken = takeInTrail(bound.state, bound.state.selfStudentId, {
    portions: remote.portions,
    events: remote.events,
    subject: { id: remote.subjectId, name: null },
  });

  if (!taken.ok) {
    // The account's own trail came back describing somebody else. That is a
    // server or configuration fault rather than a user mistake, and merging
    // it would put two people's hifz in one record.
    return {
      ok: false,
      reason: "other-account",
      message: "The server returned a record for a different person. Nothing was changed.",
    };
  }

  const trail = trailOf(taken.state.trails, taken.state.selfStudentId);

  try {
    const portions = await transport.sendPortions(trail.portions);
    const events = await transport.sendEvents(trail.events);

    return {
      ok: true,
      state: taken.state,
      tookIn: { portions: taken.added, grades: taken.grades },
      sentUp: { portions: portions.added, grades: events.added },
    };
  } catch {
    // The pull and the merge already happened and are worth keeping: the
    // device is strictly better off than before, it simply has not pushed.
    return {
      ok: false,
      reason: "unreachable",
      message: "Took in what the server had, but could not send yours up. Try again.",
    };
  }
}

/** What to say afterwards. Counts, because "Synced" answers nothing: the
 *  question in the person's head is whether their week actually went up. */
export function describeSync(outcome: SyncOutcome): string {
  if (!outcome.ok) return outcome.message;

  const parts: string[] = [];
  const { tookIn, sentUp } = outcome;

  if (tookIn.portions > 0 || tookIn.grades > 0) {
    parts.push(`Took in ${countOf(tookIn)}`);
  }
  if (sentUp.portions > 0 || sentUp.grades > 0) {
    parts.push(`sent up ${countOf(sentUp)}`);
  }
  if (parts.length === 0) return "Already up to date.";

  return `${parts.join(" · ")}.`;
}

function countOf(counts: SyncCounts): string {
  const bits: string[] = [];
  if (counts.portions > 0) {
    bits.push(`${counts.portions} ${counts.portions === 1 ? "portion" : "portions"}`);
  }
  if (counts.grades > 0) {
    bits.push(`${counts.grades} ${counts.grades === 1 ? "grade" : "grades"}`);
  }
  return bits.join(" and ");
}
