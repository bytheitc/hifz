import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { config, assertConfigured } from "./config/config";
import { connectToDB } from "./database";
import { errorHandler } from "./utils/errors";
import { authRouter, trailRouter } from "./resources";

// Checked as the app is assembled, not inside the "run directly" branch
// below. A serverless host imports this module without ever being main, and
// so does the in-memory dev script - both of which booted happily with no
// signing secret and then failed on the first sign-in with
// "secretOrPrivateKey must have a value". Refusing at boot is the whole
// point of having the check.
assertConfigured();

export const HifzTrail: Express = express();

HifzTrail.use(express.json({ limit: "2mb" }));
HifzTrail.use(express.urlencoded({ extended: true }));
HifzTrail.use(
  cors({
    origin: config.app.webOrigins,
    credentials: true,
  })
);

// Behind Vercel or nginx the client address arrives in a header, and without
// this the rate limiter sees every request as coming from the proxy.
HifzTrail.set("trust proxy", 1);

// Opened per request rather than at boot, because a serverless invocation
// may start on a cold container with no connection yet.
HifzTrail.use(async (_req: Request, _res: Response, next: NextFunction) => {
  try {
    await connectToDB();
    next();
  } catch (error) {
    next(error);
  }
});

// Guessing a password is the attack this api is actually exposed to, so the
// limit sits on the auth routes specifically and is tight.
//
// Off under test, where the whole suite comes from one address and would
// otherwise trip the limit partway through - which it did, and the symptom
// was misleading: registration started returning 429, every token after that
// was undefined, and a dozen unrelated assertions failed with 401.
if (config.app.environment !== "test") {
  HifzTrail.use(
    "/auth",
    rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false })
  );
  HifzTrail.use(
    rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false })
  );
}

HifzTrail.get("/health", (_req, res) => {
  res.json({ ok: true, environment: config.app.environment });
});

HifzTrail.use("/auth", authRouter);
HifzTrail.use("/trails", trailRouter);

HifzTrail.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "No such endpoint." });
});

HifzTrail.use(errorHandler);

// Started only when run directly. Imported by the tests, and by a serverless
// host that wants the handler rather than a listening socket.
if (require.main === module) {
  HifzTrail.listen(config.app.port, () => {
    console.log(`hifz-trail api on :${config.app.port}`);
  });
}

export default HifzTrail;
