import { Router } from "express";
import { UserRole } from "../../../generated/prisma/enums";
import { auth } from "../../middlewares/auth";
import { CartController } from "./cart.controller";

const router = Router();

router.get("/", auth(UserRole.CUSTOMER), CartController.getCart);
router.post("/", auth(UserRole.CUSTOMER), CartController.addToCart);
router.patch("/:id", auth(UserRole.CUSTOMER), CartController.updateCartItem);
router.delete("/:id", auth(UserRole.CUSTOMER), CartController.removeCartItem);

export const CartRoutes = router;
