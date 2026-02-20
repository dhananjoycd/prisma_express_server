import { Router } from "express";
import { auth } from "../../middlewares/auth";
import { AuthController } from "./auth.controller";

const router = Router();
type BetterAuthNodeHandler = (req: any, res: any) => unknown;
let betterAuthHandler: BetterAuthNodeHandler | null = null;

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/google-login", AuthController.googleLogin);
router.get("/me", auth(), AuthController.me);
router.post("/logout", auth(), AuthController.logout);
router.all("/*path", async (req, res, next) => {
  try {
    if (!betterAuthHandler) {
      const [{ toNodeHandler }, { getAuth }] = await Promise.all([
        import("better-auth/node"),
        import("../../lib/better-auth.js"),
      ]);
      const betterAuth = await getAuth();
      betterAuthHandler = toNodeHandler(betterAuth);
    }

    return betterAuthHandler(req, res);
  } catch (error) {
    return next(error);
  }
});

export const AuthRoutes = router;

