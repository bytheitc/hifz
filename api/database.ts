import mongoose from "mongoose";
import { config } from "./config/config";

/**
 * One connection, reused.
 *
 * Cached on `global` so that a hot reload in development and a warm
 * serverless invocation both find the existing connection instead of opening
 * another one. Without this a busy deployment exhausts the cluster's
 * connection limit long before it exhausts anything else.
 */
let cached = (global as any).mongooseConn as
  | { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
  | undefined;

if (!cached) {
  cached = (global as any).mongooseConn = { conn: null, promise: null };
}

export const connectToDB = async (url?: string): Promise<typeof mongoose> => {
  mongoose.set("strictQuery", true);

  if (cached!.conn) return cached!.conn;

  if (!cached!.promise) {
    const mongoUrl = url || config.db.mongodb.MONGO_URL;
    if (!mongoUrl) throw new Error("MONGO_URL is not set.");

    cached!.promise = mongoose.connect(mongoUrl, {
      // Serverless functions handle one request at a time, so a larger pool
      // buys nothing and costs connections.
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 10_000,
    });
  }

  cached!.conn = await cached!.promise;
  return cached!.conn;
};

export const disconnectFromDB = async (): Promise<void> => {
  if (cached!.conn) {
    await mongoose.disconnect();
    cached!.conn = null;
    cached!.promise = null;
  }
};
