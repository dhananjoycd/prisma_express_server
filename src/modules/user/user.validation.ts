import { UserStatus } from "../../../generated/prisma/enums";
import { z } from "zod";

export const updateMeSchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    phone: z.string().trim().min(7).optional(),
    address: z.string().trim().min(3).optional(),
    image: z.string().url().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const updateUserStatusSchema = z.object({
  status: z.enum([UserStatus.ACTIVE, UserStatus.SUSPENDED]),
});
