import { z } from "zod";

export const createMealSchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string().trim().min(2),
  description: z.string().trim().optional(),
  price: z.number().positive(),
  imageUrl: z.string().url().optional(),
  isAvailable: z.boolean().optional(),
});

export const updateMealSchema = z
  .object({
    categoryId: z.string().uuid().optional(),
    title: z.string().trim().min(2).optional(),
    description: z.string().trim().optional(),
    price: z.number().positive().optional(),
    imageUrl: z.string().url().optional(),
    isAvailable: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const mealFilterSchema = z.object({
  categoryId: z.string().uuid().optional(),
  providerId: z.string().uuid().optional(),
  search: z.string().trim().optional(),
  minPrice: z.number().nonnegative().optional(),
  maxPrice: z.number().nonnegative().optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
});
