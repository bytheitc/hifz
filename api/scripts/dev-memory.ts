/**
 * The api against a throwaway database, for working on the web app without
 * standing up a real cluster first.
 *
 * Everything written here is gone when the process stops. That is the point:
 * it is for seeing the sign-in flow work end to end, not for keeping
 * anything.
 *
 * Note the dynamic imports. `config/config.ts` reads the environment once at
 * module load and freezes it, so anything imported at the top of this file
 * would capture the environment as it was BEFORE the lines below set it -
 * which is exactly what happened: the server started with no signing secret
 * and only admitted it when someone tried to sign in.
 */
import { MongoMemoryServer } from "mongodb-memory-server";

async function main() {
  const server = await MongoMemoryServer.create();

  process.env.MONGO_URL = server.getUri();
  process.env.JWT_SECRET = process.env.JWT_SECRET || "dev-only-secret-not-for-anything-real";

  const { connectToDB } = await import("../database");
  await connectToDB(process.env.MONGO_URL);

  const { HifzTrail } = await import("../index");
  const port = Number(process.env.PORT || 4000);

  HifzTrail.listen(port, () => {
    console.log(`hifz-trail api (in-memory database) on :${port}`);
    console.log("Nothing written here survives this process.");
  });

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, async () => {
      await server.stop();
      process.exit(0);
    });
  }
}

void main();
