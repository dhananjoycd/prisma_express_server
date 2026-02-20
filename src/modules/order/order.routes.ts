import { Router } from "express";
import { UserRole } from "../../../generated/prisma/enums.js";
import { auth } from "../../middlewares/auth";
import { OrderController } from "./order.controller";

const router = Router();

router.post("/", auth(UserRole.CUSTOMER), OrderController.createOrder);
router.get("/my", auth(UserRole.CUSTOMER), OrderController.getMyOrders);
router.get("/incoming", auth(UserRole.PROVIDER), OrderController.getIncomingOrders);
router.get("/", auth(UserRole.ADMIN), OrderController.getAllOrders);
router.get("/:id", auth(UserRole.CUSTOMER, UserRole.PROVIDER, UserRole.ADMIN), OrderController.getOrderById);
router.patch(
  "/:id/status",
  auth(UserRole.CUSTOMER, UserRole.PROVIDER, UserRole.ADMIN),
  OrderController.updateOrderStatus,
);

export const OrderRoutes = router;

