import { Router } from "express";
import { AiController } from "./ai.controller";

const router = Router();

router.get("/recommendations/meals", AiController.getMealRecommendations);
router.get("/search/meals", AiController.searchMealsByNaturalLanguage);
router.get("/reviews/summary", AiController.summarizeMealReviews);
router.post("/support/chat", AiController.supportChat);

export const AiRoutes = router;
