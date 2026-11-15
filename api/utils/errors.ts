import { NextFunction, Request, Response } from "express";

/**
 * An error that already knows what the client should be told.
 *
 * Anything thrown that is not one of these is a bug rather than a refusal,
 * and the handler says "something went wrong" instead of leaking a stack
 * trace or a mongo error with a connection string in it.
 */
export class HttpError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function asyncHandler<T extends (...args: any[]) => Promise<any>>(fn: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message, code: error.code });
    return;
  }

  // A duplicate key is the one mongo error worth translating: it is how a
  // second account on the same email arrives, and 409 is the honest answer.
  if (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: number }).code === 11000
  ) {
    res.status(409).json({ error: "That already exists.", code: "duplicate" });
    return;
  }

  console.error(error);
  res.status(500).json({ error: "Something went wrong." });
}
