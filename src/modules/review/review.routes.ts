import { Router } from "express";
import { UserRole } from "../../../generated/prisma/enums.js";
import { auth } from "../../middlewares/auth";
import { ReviewController } from "./review.controller";

const router = Router();

router.post("/", auth(UserRole.CUSTOMER), ReviewController.createReview);
router.get("/meal/:mealId", ReviewController.getMealReviews);

export const ReviewRoutes = router;

