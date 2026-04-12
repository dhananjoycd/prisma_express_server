import { Request, Response } from "express";
import { getAuth } from "../../lib/better-auth";
import { catchAsync } from "../../utils/catchAsync";
import { toFetchHeaders } from "../../utils/http";
import { AiService } from "./ai.service";

function parseList(value: unknown) {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export const AiController = {
  getMealRecommendations: catchAsync(async (req: Request, res: Response) => {
    const betterAuth = await getAuth();
    const session = await betterAuth.api.getSession({
      headers: toFetchHeaders(req),
    });

    const mealId =
      typeof req.query.mealId === "string" ? req.query.mealId : undefined;
    const limit =
      typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;
    const excludeIds = parseList(req.query.excludeIds);

    const result = await AiService.recommendMeals({
      userId: session?.user?.id,
      mealId,
      limit,
      excludeIds,
    });

    res.status(200).json({
      success: true,
      message: session?.user?.id
        ? "Personalized meal recommendations retrieved successfully"
        : "Smart meal recommendations retrieved successfully",
      data: result,
    });
  }),

  searchMealsByNaturalLanguage: catchAsync(
    async (req: Request, res: Response) => {
      const betterAuth = await getAuth();
      const session = await betterAuth.api.getSession({
        headers: toFetchHeaders(req),
      });

      const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
      if (!query) {
        res.status(400).json({
          success: false,
          message: "Query parameter 'q' is required",
        });
        return;
      }

      const limit =
        typeof req.query.limit === "string"
          ? Number(req.query.limit)
          : undefined;

      const result = await AiService.searchMealsByNaturalLanguage({
        userId: session?.user?.id,
        query,
        limit,
      });

      res.status(200).json({
        success: true,
        message: session?.user?.id
          ? "Personalized natural language meal search completed"
          : "Natural language meal search completed",
        data: result,
      });
    },
  ),

  summarizeMealReviews: catchAsync(async (req: Request, res: Response) => {
    const mealId =
      typeof req.query.mealId === "string" ? req.query.mealId.trim() : "";
    if (!mealId) {
      res.status(400).json({
        success: false,
        message: "Query parameter 'mealId' is required",
      });
      return;
    }

    const result = await AiService.summarizeMealReviews({ mealId });
    if (!result) {
      res.status(404).json({
        success: false,
        message: "Meal not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Meal review summary retrieved successfully",
      data: result,
    });
  }),

  supportChat: catchAsync(async (req: Request, res: Response) => {
    const betterAuth = await getAuth();
    const session = await betterAuth.api.getSession({
      headers: toFetchHeaders(req),
    });

    const message =
      typeof req.body?.message === "string" ? req.body.message.trim() : "";
    if (!message) {
      res.status(400).json({
        success: false,
        message: "Body field 'message' is required",
      });
      return;
    }

    const result = await AiService.supportChat({
      message,
      userId: session?.user?.id,
    });

    res.status(200).json({
      success: true,
      message: "Support response generated successfully",
      data: result,
    });
  }),
};
