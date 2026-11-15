import { Schema, model, models } from "mongoose";
import { randomUUID } from "node:crypto";
import type { IUser } from "./interface";

const UserSchema = new Schema<IUser>(
  {
    // Stored lowercased and trimmed so that one person cannot end up with two
    // accounts by capitalising their own address differently.
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    name: { type: String, trim: true },
    subjectId: { type: String, required: true, default: () => randomUUID() },
  },
  { timestamps: true }
);

// `models.User ||` because a serverless function that reloads this file would
// otherwise throw OverwriteModelError on the second invocation.
export const User = models.User || model<IUser>("User", UserSchema);
