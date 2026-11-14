import type { Document, Types } from "mongoose";

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  name?: string;
  /**
   * Whose hifz this account's own trail records, as a stable id that travels
   * in exported files. Minted once at registration and never reissued: it is
   * what lets a file be recognised as belonging to this person on a device
   * that has never seen this account.
   */
  subjectId: string;
  createdAt: Date;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string | null;
  subjectId: string;
}
