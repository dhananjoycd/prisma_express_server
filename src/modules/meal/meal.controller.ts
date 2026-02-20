import { Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import { catchAsync } from "../../utils/catchAsync";
import { getRequiredParam } from "../../utils/request";
import { MealService } from "./meal.service";
import {
  createMealSchema,
  mealFilterSchema,
  updateMealSchema,
} from "./meal.validation";

export const MealController = {
  createMeal: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const payload = createMealSchema.parse(req.body);
    const result = await MealService.createMeal(req.user.userId, payload);

    res.status(201).json({
      success: true,
      message: "Meal created successfully",
      data: result,
    });
  }),

  getMeals: catchAsync(async (req: Request, res: Response) => {
    const filters: {
      categoryId?: string;
      providerId?: string;
      search?: string;
      minPrice?: number;
      maxPrice?: number;
      page?: number;
      limit?: number;
    } = {};

    if (typeof req.query.categoryId === "string") filters.categoryId = req.query.categoryId;
    if (typeof req.query.providerId === "string") filters.providerId = req.query.providerId;
    if (typeof req.query.search === "string") filters.search = req.query.search;
    if (typeof req.query.minPrice === "string") filters.minPrice = Number(req.query.minPrice);
    if (typeof req.query.maxPrice === "string") filters.maxPrice = Number(req.query.maxPrice);
    if (typeof req.query.page === "string") filters.page = Number(req.query.page);
    if (typeof req.query.limit === "string") filters.limit = Number(req.query.limit);

    const validatedFilters = mealFilterSchema.parse(filters);
    const result = await MealService.getMeals(validatedFilters);

    res.status(200).json({
      success: true,
      message: "Meals retrieved successfully",
      ...result,
    });
  }),

  getMealById: catchAsync(async (req: Request, res: Response) => {
    const id = getRequiredParam(req.params.id, "Meal id");

    const result = await MealService.getMealById(id);

    res.status(200).json({
      success: true,
      message: "Meal retrieved successfully",
      data: result,
    });
  }),

  updateMeal: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const id = getRequiredParam(req.params.id, "Meal id");

    const payload = updateMealSchema.parse(req.body);
    const result = await MealService.updateMeal(req.user.userId, req.user.role, id, payload);

    res.status(200).json({
      success: true,
      message: "Meal updated successfully",
      data: result,
    });
  }),

  deleteMeal: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const id = getRequiredParam(req.params.id, "Meal id");

    await MealService.deleteMeal(req.user.userId, req.user.role, id);

    res.status(200).json({
      success: true,
      message: "Meal deleted successfully",
    });
  }),

  getMealReviews: catchAsync(async (req: Request, res: Response) => {
    const id = getRequiredParam(req.params.id, "Meal id");

    const result = await MealService.getMealReviews(id);

    res.status(200).json({
      success: true,
      message: "Meal reviews retrieved successfully",
      data: result,
    });
  }),
};

