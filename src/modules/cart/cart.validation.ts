import { z } from "zod";

export const addToCartSchema = z.object({
  mealId: z.string().uuid(),
  quantity: z.number().int().positive().optional(),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().positive(),
});
