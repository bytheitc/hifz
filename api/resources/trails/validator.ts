import Joi from "joi";
import { BaseValidator } from "../../config/midware";

const dateOnly = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/);

const portion = Joi.object({
  id: Joi.string().required(),
  surah: Joi.number().integer().min(1).max(114).required(),
  fromAyah: Joi.number().integer().min(1).required(),
  toAyah: Joi.number().integer().min(1).required(),
  box: Joi.number().integer().min(0).max(5).required(),
  lastReviewed: dateOnly.allow(null).required(),
  addedOn: dateOnly.required(),
  lapses: Joi.number().integer().min(0).required(),
}).custom((value, helpers) =>
  // The same rule the add form enforces, so a portion cannot reach the
  // database in a shape the app would have refused to create.
  value.toAyah < value.fromAyah ? helpers.error("any.invalid") : value
, "ayah range");

const event = Joi.object({
  id: Joi.string().required(),
  portionId: Joi.string().required(),
  grade: Joi.string().valid("solid", "shaky", "lost").required(),
  on: dateOnly.required(),
  recordedAt: Joi.string().required(),
  by: Joi.object({
    kind: Joi.string().valid("self", "teacher").required(),
    teacherId: Joi.string().optional(),
  }).required(),
});

export class TrailValidator extends BaseValidator {
  protected schemas = {
    // Capped because one request should not be able to hand the database an
    // unbounded array; a real trail is tens of portions, not thousands.
    putPortions: Joi.object({
      portions: Joi.array().items(portion).max(2000).required(),
    }),
    postEvents: Joi.object({
      events: Joi.array().items(event).max(5000).required(),
    }),
  };
}
