import { Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import { catchAsync } from "../../utils/catchAsync";
import { getRequiredParam } from "../../utils/request";
import { ReviewService } from "./review.service";
import { createReviewSchema } from "./review.validation";

export const ReviewController = {
  createReview: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const payload = createReviewSchema.parse(req.body);
    const result = await ReviewService.createReview(req.user.userId, payload);

    res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      data: result,
    });
  }),

  getMealReviews: catchAsync(async (req: Request, res: Response) => {
    const mealId = getRequiredParam(req.params.mealId, "Meal id");

    const result = await ReviewService.getMealReviews(mealId);

    res.status(200).json({
      success: true,
      message: "Reviews retrieved successfully",
      data: result,
    });
  }),
};
