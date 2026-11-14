import { Router } from "express";
import { asyncHandler } from "../../utils/errors";
import { requireUser } from "../../middlewares/auth";
import { TrailController } from "./controller";
import { TrailValidator } from "./validator";

const router = Router();
const controller = new TrailController();
const validator = new TrailValidator();

// Everything here is scoped to the signed-in account. There is deliberately
// no :userId in any of these paths: a trail is reached by being the person
// whose trail it is, not by naming them.
router.get("/me", requireUser, asyncHandler(controller.mine.bind(controller)));
router.post(
  "/me/portions",
  requireUser,
  validator.validate("putPortions"),
  asyncHandler(controller.addPortions.bind(controller))
);
router.post(
  "/me/events",
  requireUser,
  validator.validate("postEvents"),
  asyncHandler(controller.addEvents.bind(controller))
);

export default router;
