import { Router } from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "../../middlewares/auth";
import { auth as betterAuth } from "../../lib/better-auth";
import { AuthController } from "./auth.controller";

const router = Router();
const betterAuthHandler = toNodeHandler(betterAuth);

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/google-login", AuthController.googleLogin);
router.get("/me", auth(), AuthController.me);
router.post("/logout", auth(), AuthController.logout);
router.all("/*path", (req, res) => {
  return betterAuthHandler(req, res);
});

export const AuthRoutes = router;
