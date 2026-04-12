import { Router } from "express";
import { UserRole } from "../../../generated/prisma/enums";
import { auth } from "../../middlewares/auth";
import { AuditController } from "./audit.controller";

const router = Router();

router.get(
  "/",
  auth(UserRole.ADMIN, UserRole.PROVIDER),
  AuditController.getLogs,
);

export const AuditRoutes = router;
