import { Router } from "express";
import { UserRole } from "../../../generated/prisma/enums.js";
import { auth } from "../../middlewares/auth";
import { PaymentController } from "./payment.controller";

const router = Router();

router.post(
  "/stripe/checkout-session",
  auth(UserRole.CUSTOMER),
  PaymentController.createCheckoutSession,
);
router.post(
  "/stripe/confirm-session",
  auth(UserRole.CUSTOMER),
  PaymentController.confirmCheckoutSession,
);

export const PaymentRoutes = router;
