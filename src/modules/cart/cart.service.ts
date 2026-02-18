import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

type AddCartPayload = {
  mealId: string;
  quantity?: number | undefined;
};

export const CartService = {
  async getCart(customerId: string) {
    const items = await prisma.cartItem.findMany({
      where: { customerId },
      include: {
        meal: {
          include: {
            category: true,
            provider: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const total = items.reduce(
      (sum, item) =>
        sum.plus(new Prisma.Decimal(item.meal.price).mul(item.quantity)),
      new Prisma.Decimal(0),
    );

    return {
      items,
      totalAmount: total.toString(),
    };
  },

  async addToCart(customerId: string, payload: AddCartPayload) {
    if (!payload.mealId) {
      throw new AppError("mealId is required", 400);
    }

    const quantity = payload.quantity ?? 1;
    if (quantity < 1) {
      throw new AppError("Quantity must be at least 1", 400);
    }

    const meal = await prisma.meal.findUnique({ where: { id: payload.mealId } });
    if (!meal || !meal.isAvailable) {
      throw new AppError("Meal not available", 404);
    }

    const existing = await prisma.cartItem.findUnique({
      where: {
        customerId_mealId: {
          customerId,
          mealId: payload.mealId,
        },
      },
    });

    if (existing) {
      return prisma.cartItem.update({
        where: { id: existing.id },
        data: {
          quantity: existing.quantity + quantity,
        },
      });
    }

    return prisma.cartItem.create({
      data: {
        customerId,
        mealId: payload.mealId,
        quantity,
      },
    });
  },

  async updateCartItem(customerId: string, id: string, quantity: number) {
    if (quantity < 1) {
      throw new AppError("Quantity must be at least 1", 400);
    }

    const item = await prisma.cartItem.findFirst({
      where: {
        id,
        customerId,
      },
    });

    if (!item) {
      throw new AppError("Cart item not found", 404);
    }

    return prisma.cartItem.update({
      where: { id },
      data: { quantity },
    });
  },

  async removeCartItem(customerId: string, id: string) {
    const item = await prisma.cartItem.findFirst({
      where: {
        id,
        customerId,
      },
    });

    if (!item) {
      throw new AppError("Cart item not found", 404);
    }

    await prisma.cartItem.delete({ where: { id } });
  },

  async clearCart(customerId: string) {
    await prisma.cartItem.deleteMany({ where: { customerId } });
  },
};
