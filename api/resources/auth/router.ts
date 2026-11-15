import { Router } from "express";
import { asyncHandler } from "../../utils/errors";
import { requireUser } from "../../middlewares/auth";
import { AuthController } from "./controller";
import { AuthValidator } from "./validator";

const router = Router();
const controller = new AuthController();
const validator = new AuthValidator();

router.post("/register", validator.validate("register"), asyncHandler(controller.register.bind(controller)));
router.post("/login", validator.validate("login"), asyncHandler(controller.login.bind(controller)));
router.get("/me", requireUser, asyncHandler(controller.me.bind(controller)));

export default router;
