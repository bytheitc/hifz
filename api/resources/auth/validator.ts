import Joi from "joi";
import { BaseValidator } from "../../config/midware";

export class AuthValidator extends BaseValidator {
  protected schemas = {
    register: Joi.object({
      email: Joi.string().email({ tlds: { allow: false } }).required(),
      // Long rather than complicated. Composition rules push people towards
      // one predictable password reused everywhere; length is what actually
      // costs an attacker something.
      password: Joi.string().min(10).max(200).required(),
      name: Joi.string().trim().max(80).optional(),
    }),
    login: Joi.object({
      email: Joi.string().email({ tlds: { allow: false } }).required(),
      password: Joi.string().required(),
    }),
  };
}
