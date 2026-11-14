import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { connectToDB, disconnectFromDB } from "../database";

let server: MongoMemoryServer | null = null;

/** A real mongod, in a temp directory, thrown away afterwards. The api is
 *  mostly indexes and upserts, and neither of those can be checked against
 *  a stub. */
export async function startDb(): Promise<void> {
  server = await MongoMemoryServer.create();
  await connectToDB(server.getUri());
  // Unique indexes are built in the background; the idempotency tests depend
  // on them existing, so wait rather than race.
  await Promise.all(
    Object.values(mongoose.models).map((model) => model.createIndexes())
  );
}

export async function stopDb(): Promise<void> {
  await disconnectFromDB();
  if (server) await server.stop();
  server = null;
}

export async function clearDb(): Promise<void> {
  const { collections } = mongoose.connection;
  await Promise.all(
    Object.values(collections).map((c) => c.deleteMany({}))
  );
}
