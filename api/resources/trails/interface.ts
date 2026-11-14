import type { Document, Types } from "mongoose";

export type Grade = "solid" | "shaky" | "lost";

export interface IPortion {
  id: string;
  surah: number;
  fromAyah: number;
  toAyah: number;
  box: number;
  lastReviewed: string | null;
  addedOn: string;
  lapses: number;
}

/**
 * A trail holds BASELINES, not current state.
 *
 * The portion as it stood before the grade log begins. The app folds the log
 * over these to get today's boxes, and writing a folded result back here
 * would make the next fold apply every grade a second time. The api stores;
 * it does not fold.
 */
export interface ITrail extends Document {
  user: Types.ObjectId;
  subjectId: string;
  portions: IPortion[];
  updatedAt: Date;
}

export interface IGradeEvent extends Document {
  user: Types.ObjectId;
  /** The id minted by the device that recorded it. Unique per account, which
   *  is what makes re-sending the same log add nothing. */
  eventId: string;
  portionId: string;
  grade: Grade;
  on: string;
  recordedAt: string;
  by: { kind: "self" | "teacher"; teacherId?: string };
}
