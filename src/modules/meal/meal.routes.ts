import { Router } from "express";
import { UserRole } from "../../../generated/prisma/enums.js";
import { auth } from "../../middlewares/auth";
import { MealController } from "./meal.controller";

const router = Router();

router.get("/", MealController.getMeals);
router.get("/:id", MealController.getMealById);
router.get("/:id/reviews", MealController.getMealReviews);
router.post("/", auth(UserRole.PROVIDER, UserRole.ADMIN), MealController.createMeal);
router.patch("/:id", auth(UserRole.PROVIDER, UserRole.ADMIN), MealController.updateMeal);
router.delete("/:id", auth(UserRole.PROVIDER, UserRole.ADMIN), MealController.deleteMeal);

export const MealRoutes = router;

