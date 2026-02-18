import { OrderStatus, UserRole } from "../../../generated/prisma/enums";
import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

type CreateOrderPayload = {
  deliveryAddress: string;
  note?: string | undefined;
};

const orderStatusTransitions: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.ACCEPTED, OrderStatus.CANCELED],
  [OrderStatus.ACCEPTED]: [OrderStatus.PREPARING, OrderStatus.CANCELED],
  [OrderStatus.PREPARING]: [OrderStatus.OUT_FOR_DELIVERY],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELED]: [],
};

export const OrderService = {
  async createOrder(customerId: string, payload: CreateOrderPayload) {
    if (!payload.deliveryAddress) {
      throw new AppError("deliveryAddress is required", 400);
    }

    const cartItems = await prisma.cartItem.findMany({
      where: { customerId },
      include: { meal: true },
    });

    if (cartItems.length === 0) {
      throw new AppError("Cart is empty", 400);
    }

    const totalAmount = cartItems.reduce(
      (sum, item) => sum.plus(new Prisma.Decimal(item.meal.price).mul(item.quantity)),
      new Prisma.Decimal(0),
    );

    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          customerId,
          deliveryAddress: payload.deliveryAddress,
          totalAmount,
          ...(payload.note !== undefined ? { note: payload.note } : {}),
          items: {
            create: cartItems.map((item) => {
              const unitPrice = new Prisma.Decimal(item.meal.price);
              const subTotal = unitPrice.mul(item.quantity);
              return {
                mealId: item.mealId,
                quantity: item.quantity,
                unitPrice,
                subTotal,
              };
            }),
          },
        },
        include: {
          items: {
            include: {
              meal: true,
            },
          },
        },
      });

      await tx.cartItem.deleteMany({ where: { customerId } });

      return createdOrder;
    });

    return order;
  },

  async getMyOrders(customerId: string) {
    return prisma.order.findMany({
      where: { customerId },
      include: {
        items: {
          include: {
            meal: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async getIncomingOrders(providerId: string) {
    return prisma.order.findMany({
      where: {
        items: {
          some: {
            meal: {
              providerId,
            },
          },
        },
      },
      include: {
        customer: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            meal: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async getAllOrders() {
    return prisma.order.findMany({
      include: {
        customer: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: { meal: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async getOrderById(userId: string, role: UserRole, orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: { meal: true },
        },
      },
    });

    if (!order) {
      throw new AppError("Order not found", 404);
    }

    if (role === UserRole.ADMIN) {
      return order;
    }

    if (role === UserRole.CUSTOMER) {
      if (order.customerId !== userId) {
        throw new AppError("Forbidden", 403);
      }

      return order;
    }

    const hasOwnedMeal = order.items.some((item) => item.meal.providerId === userId);
    if (!hasOwnedMeal) {
      throw new AppError("Forbidden", 403);
    }

    return order;
  },

  async updateOrderStatus(userId: string, role: UserRole, orderId: string, status: OrderStatus) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            meal: true,
          },
        },
      },
    });

    if (!order) {
      throw new AppError("Order not found", 404);
    }

    if (role === UserRole.PROVIDER) {
      const hasOwnedMeal = order.items.some((item) => item.meal.providerId === userId);
      if (!hasOwnedMeal) {
        throw new AppError("Forbidden", 403);
      }
    }

    if (role === UserRole.CUSTOMER) {
      if (order.customerId !== userId) {
        throw new AppError("Forbidden", 403);
      }

      if (order.status !== OrderStatus.PENDING || status !== OrderStatus.CANCELED) {
        throw new AppError("Customers can only cancel pending orders", 403);
      }
    } else {
      const allowed = orderStatusTransitions[order.status] ?? [];
      if (!allowed.includes(status)) {
        throw new AppError(`Invalid status transition from ${order.status} to ${status}`, 400);
      }
    }

    return prisma.order.update({
      where: { id: orderId },
      data: { status },
    });
  },
};
