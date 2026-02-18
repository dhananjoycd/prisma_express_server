import { OrderStatus } from "../../../generated/prisma/enums";
import { z } from "zod";

export const createOrderSchema = z.object({
  deliveryAddress: z.string().trim().min(5),
  note: z.string().trim().optional(),
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
