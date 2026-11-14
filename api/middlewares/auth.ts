import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/errors";
import { AuthService } from "../resources/auth/service";

const service = new AuthService();

/**
 * Put the signed-in user on the request, or refuse.
 *
 * Every trail endpoint reads the account from here rather than from anything
 * the client sent. A student id in a URL or a body is a request, not a
 * claim: the only identity that counts is the one in the token.
 */
export async function requireUser(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new HttpError(401, "Not signed in.", "no-token");
    }

    const payload = service.verify(header.slice("Bearer ".length).trim());
    const user = await service.byId(payload.sub);
    if (!user) throw new HttpError(401, "That account no longer exists.", "no-user");

    (req as any).user = user;
    next();
  } catch (error) {
    next(error);
  }
}
