import * as dotenv from "dotenv";

dotenv.config();

/**
 * Everything the api needs from its environment, read once and frozen.
 *
 * Read here rather than scattered through the resources so that a missing
 * variable is a single obvious failure at boot instead of a surprise on the
 * first request that happens to need it.
 */
export const config = Object.freeze({
  app: {
    port: parseInt(process.env.PORT || "4000", 10),
    environment: process.env.NODE_ENV || "development",
    isProduction: process.env.NODE_ENV === "production",
    webOrigins: (process.env.WEB_ORIGIN || "http://localhost:3000")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  },
  db: {
    mongodb: {
      MONGO_URL: process.env.MONGO_URL as string,
    },
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET as string,
    accessExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "30d",
    bcryptRounds: Number(process.env.BCRYPT_SALT_ROUNDS || 12),
  },
});

/**
 * Refuse to start without the two secrets that cannot be guessed at.
 *
 * A server that boots with no JWT secret signs tokens with `undefined` and
 * accepts anybody's; that is worse than not starting. Skipped under test,
 * where the in-memory database supplies its own URL.
 */
export function assertConfigured(): void {
  if (config.app.environment === "test") return;
  const missing: string[] = [];
  if (!config.db.mongodb.MONGO_URL) missing.push("MONGO_URL");
  if (!config.auth.jwtSecret) missing.push("JWT_SECRET");
  if (missing.length > 0) {
    throw new Error(
      `Cannot start: ${missing.join(" and ")} missing. See api/.env.example.`
    );
  }
}
