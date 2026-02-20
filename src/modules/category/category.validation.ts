import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().trim().min(2),
  description: z.string().trim().optional(),
});

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    description: z.string().trim().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

