import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { getRequiredParam } from "../../utils/request";
import { CategoryService } from "./category.service";
import { createCategorySchema, updateCategorySchema } from "./category.validation";

export const CategoryController = {
  createCategory: catchAsync(async (req: Request, res: Response) => {
    const payload = createCategorySchema.parse(req.body);
    const result = await CategoryService.createCategory(payload);

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: result,
    });
  }),

  getCategories: catchAsync(async (_req: Request, res: Response) => {
    const result = await CategoryService.getCategories();

    res.status(200).json({
      success: true,
      message: "Categories retrieved successfully",
      data: result,
    });
  }),

  updateCategory: catchAsync(async (req: Request, res: Response) => {
    const id = getRequiredParam(req.params.id, "Category id");
    const payload = updateCategorySchema.parse(req.body);
    const result = await CategoryService.updateCategory(id, payload);

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: result,
    });
  }),

  deleteCategory: catchAsync(async (req: Request, res: Response) => {
    const id = getRequiredParam(req.params.id, "Category id");

    const result = await CategoryService.deleteCategory(id);

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
      data: result,
    });
  }),
};

