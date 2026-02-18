import { Router } from "express";
import { UserRole } from "../../../generated/prisma/enums";
import { auth } from "../../middlewares/auth";
import { UserController } from "./user.controller";

const router = Router();

router.get("/me", auth(), UserController.getMe);
router.patch("/me", auth(), UserController.updateMe);
router.get("/", auth(UserRole.ADMIN), UserController.getUsers);
router.patch("/:id/status", auth(UserRole.ADMIN), UserController.updateStatus);

export const UserRoutes = router;
