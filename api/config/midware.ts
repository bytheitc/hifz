import type { NextFunction, Request, Response } from "express";
import type Joi from "joi";
import { HttpError } from "../utils/errors";

/**
 * Validation as middleware, so a controller never receives a shape it did
 * not ask for.
 *
 * `stripUnknown` matters more here than it looks: the trail endpoints take
 * objects that go more or less straight into the database, and a client that
 * posts an extra field should not be able to decide what gets stored.
 */
export abstract class BaseValidator {
  protected abstract schemas: Record<string, Joi.ObjectSchema>;

  public validate(name: string) {
    return (req: Request, _res: Response, next: NextFunction): void => {
      const schema = this.schemas[name];
      if (!schema) {
        next(new HttpError(500, `No validation schema named ${name}.`));
        return;
      }

      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        next(
          new HttpError(
            422,
            error.details.map((d) => d.message).join(", "),
            "invalid"
          )
        );
        return;
      }

      req.body = value;
      next();
    };
  }
}
