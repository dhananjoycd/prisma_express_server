import { OrderStatus } from "../../../generated/prisma/enums.js";
import { z } from "zod";

export const createOrderSchema = z.object({
  deliveryAddress: z.string().trim().min(5),
  note: z.string().trim().optional(),
  scheduleType: z.enum(["NOW", "LATER"]).optional(),
  scheduledAt: z.string().datetime().optional(),
}).superRefine((value, ctx) => {
  if (value.scheduleType === "LATER" && !value.scheduledAt) {
    ctx.addIssue({
      code: "custom",
      path: ["scheduledAt"],
      message: "scheduledAt is required when scheduleType is LATER",
    });
  }
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    OrderStatus.PENDING,
    OrderStatus.ACCEPTED,
    OrderStatus.PREPARING,
    OrderStatus.OUT_FOR_DELIVERY,
    OrderStatus.DELIVERED,
    OrderStatus.CANCELED,
  ]),
});

