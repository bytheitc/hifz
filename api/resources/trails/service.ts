import type { Types } from "mongoose";
import { GradeEvent, Trail } from "./model";
import type { IPortion } from "./interface";

interface IncomingEvent {
  id: string;
  portionId: string;
  grade: "solid" | "shaky" | "lost";
  on: string;
  recordedAt: string;
  by: { kind: "self" | "teacher"; teacherId?: string };
}

export class TrailService {
  /** The account's trail, created empty on first look rather than 404ing:
   *  a new account has a trail, it is simply empty. */
  async mine(user: Types.ObjectId, subjectId: string) {
    const trail =
      (await Trail.findOne({ user })) ||
      (await Trail.create({ user, subjectId, portions: [] }));

    const events = await GradeEvent.find({ user }).sort({ on: 1, recordedAt: 1 });

    return {
      subjectId: trail.subjectId,
      portions: trail.portions,
      events: events.map((e) => ({
        id: e.eventId,
        portionId: e.portionId,
        grade: e.grade,
        on: e.on,
        recordedAt: e.recordedAt,
        by: e.by.kind === "teacher"
          ? { kind: "teacher" as const, teacherId: e.by.teacherId as string }
          : { kind: "self" as const },
      })),
    };
  }

  /**
   * Take on portions the device has that the account does not.
   *
   * Only new ids are added. A portion already stored keeps the baseline it
   * has, because the device sending this may have folded its grades in
   * before sending, and overwriting a baseline with a folded result would
   * count every one of those grades twice on the next read.
   */
  async addPortions(
    user: Types.ObjectId,
    subjectId: string,
    portions: IPortion[]
  ): Promise<{ added: number; total: number }> {
    const trail =
      (await Trail.findOne({ user })) ||
      (await Trail.create({ user, subjectId, portions: [] }));

    const known = new Set(trail.portions.map((p: IPortion) => p.id));
    const fresh = portions.filter((p) => !known.has(p.id));

    if (fresh.length > 0) {
      trail.portions.push(...fresh);
      await trail.save();
    }

    return { added: fresh.length, total: trail.portions.length };
  }

  /**
   * Append grades, idempotently.
   *
   * `ordered: false` lets the insert carry on past the duplicates rather than
   * stopping at the first one, and the unique index on (user, eventId) is
   * what makes a repeated send a no-op. A phone that loses signal mid-sync
   * and retries must not double a student's history.
   */
  async addEvents(
    user: Types.ObjectId,
    events: IncomingEvent[]
  ): Promise<{ added: number; alreadyHad: number }> {
    if (events.length === 0) return { added: 0, alreadyHad: 0 };

    const docs = events.map((e) => ({
      user,
      eventId: e.id,
      portionId: e.portionId,
      grade: e.grade,
      on: e.on,
      recordedAt: e.recordedAt,
      by: e.by,
    }));

    try {
      const inserted = await GradeEvent.insertMany(docs, { ordered: false });
      return { added: inserted.length, alreadyHad: events.length - inserted.length };
    } catch (error) {
      // A bulk write that hit duplicates reports them here rather than
      // throwing them away; anything else is a real failure.
      const bulk = error as { writeErrors?: unknown[]; insertedDocs?: unknown[]; code?: number };
      const duplicatesOnly =
        Array.isArray(bulk.writeErrors) &&
        bulk.writeErrors.every(
          (w) => (w as { err?: { code?: number }; code?: number }).code === 11000 ||
                 (w as { err?: { code?: number } }).err?.code === 11000
        );

      if (duplicatesOnly) {
        const added = Array.isArray(bulk.insertedDocs) ? bulk.insertedDocs.length : 0;
        return { added, alreadyHad: events.length - added };
      }
      throw error;
    }
  }
}
