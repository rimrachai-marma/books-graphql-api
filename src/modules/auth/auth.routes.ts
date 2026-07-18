import { Router } from "express";

import { auth } from "../../middleware/auth";
import { AuthController } from "./auth.controller";
import { loginSchema, signupSchema } from "./auth.validation";
import { validateRequestBody } from "../../middleware/validation";

const router = Router();
const authController = new AuthController();

router.post("/signup", validateRequestBody(signupSchema), authController.signup);
router.post("/login", validateRequestBody(loginSchema), authController.login);
router.post("/refresh", authController.refresh);
router.get("/verify", auth, authController.verify);

export default router;
