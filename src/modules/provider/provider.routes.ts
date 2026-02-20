import { Router } from "express";
import { ProviderController } from "./provider.controller";

const router = Router();

router.get("/", ProviderController.getProviders);
router.get("/:id", ProviderController.getProviderById);

export const ProviderRoutes = router;

