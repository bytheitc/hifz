import { Schema, model, models } from "mongoose";
import { randomUUID } from "node:crypto";
import type { IGradeEvent, IPortion, ITrail } from "./interface";

const PortionSchema = new Schema<IPortion>(
  {
    id: { type: String, required: true },
    surah: { type: Number, required: true, min: 1, max: 114 },
    fromAyah: { type: Number, required: true, min: 1 },
    toAyah: { type: Number, required: true, min: 1 },
    box: { type: Number, required: true, min: 0, max: 5 },
    lastReviewed: { type: String, default: null },
    addedOn: { type: String, required: true },
    lapses: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false }
);

const TrailSchema = new Schema<ITrail>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    subjectId: { type: String, required: true, default: () => randomUUID() },
    portions: { type: [PortionSchema], default: [] },
  },
  { timestamps: true }
);

const GradeEventSchema = new Schema<IGradeEvent>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    eventId: { type: String, required: true },
    portionId: { type: String, required: true },
    grade: { type: String, required: true, enum: ["solid", "shaky", "lost"] },
    on: { type: String, required: true },
    recordedAt: { type: String, required: true },
    by: {
      kind: { type: String, required: true, enum: ["self", "teacher"] },
      teacherId: { type: String },
    },
  },
  { timestamps: true }
);

/**
 * The index that makes syncing safe to repeat.
 *
 * A grade is identified by the id the recording device gave it, so sending
 * the same log twice - a retry on a bad connection, the same file imported
 * again - inserts nothing the second time. Without this, every reconnection
 * would quietly multiply a student's history.
 */
GradeEventSchema.index({ user: 1, eventId: 1 }, { unique: true });
GradeEventSchema.index({ user: 1, on: 1 });

export const Trail = models.Trail || model<ITrail>("Trail", TrailSchema);
export const GradeEvent =
  models.GradeEvent || model<IGradeEvent>("GradeEvent", GradeEventSchema);
