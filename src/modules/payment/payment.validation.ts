import { z } from "zod";

const scheduleTypeSchema = z.enum(["NOW", "LATER"]);

export const createCheckoutSchema = z
  .object({
    deliveryAddress: z.string().trim().min(5, "deliveryAddress is required"),
    note: z.string().trim().min(1).max(500).optional(),
    scheduleType: scheduleTypeSchema.optional(),
    scheduledAt: z.string().datetime().optional(),
    successUrl: z.string().url().optional(),
    cancelUrl: z.string().url().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.scheduleType === "LATER" && !value.scheduledAt) {
      ctx.addIssue({
        path: ["scheduledAt"],
        code: z.ZodIssueCode.custom,
        message: "scheduledAt is required when scheduleType is LATER",
      });
    }
  });

export const confirmCheckoutSchema = z.object({
  sessionId: z.string().trim().min(1, "sessionId is required"),
});
