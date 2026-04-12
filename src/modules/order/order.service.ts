import { OrderStatus, UserRole } from "../../../generated/prisma/enums";
import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

type CreateOrderPayload = {
  deliveryAddress: string;
  note?: string | undefined;
  scheduleType?: "NOW" | "LATER" | undefined;
  scheduledAt?: string | undefined;
};

const orderStatusTransitions: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.ACCEPTED, OrderStatus.CANCELED],
  [OrderStatus.ACCEPTED]: [OrderStatus.PREPARING, OrderStatus.CANCELED],
  [OrderStatus.PREPARING]: [OrderStatus.OUT_FOR_DELIVERY],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELED]: [],
};

const resolveScheduledAt = (payload: CreateOrderPayload) => {
  const scheduleType = payload.scheduleType ?? "NOW";

  if (scheduleType !== "LATER") {
    return undefined;
  }

  if (!payload.scheduledAt?.trim()) {
    throw new AppError(
      "scheduledAt is required when scheduleType is LATER",
      400,
    );
  }

  const scheduledAt = new Date(payload.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) {
    throw new AppError("scheduledAt must be a valid datetime", 400);
  }

  if (scheduledAt.getTime() <= Date.now()) {
    throw new AppError("scheduledAt must be in the future", 400);
  }

  return scheduledAt;
};

export const OrderService = {
  async createOrder(customerId: string, payload: CreateOrderPayload) {
    const deliveryAddress = payload.deliveryAddress?.trim();
    if (!deliveryAddress) {
      throw new AppError("deliveryAddress is required", 400);
    }

    const scheduledAt = resolveScheduledAt(payload);
    const note = payload.note?.trim() || undefined;

    const cartItems = await prisma.cartItem.findMany({
      where: { customerId },
      include: { meal: true },
    });

    if (cartItems.length === 0) {
      throw new AppError("Cart is empty", 400);
    }

    const providerIds = new Set(cartItems.map((item) => item.meal.providerId));
    if (providerIds.size > 1) {
      throw new AppError(
        "You can order from one provider at a time. Please split your cart.",
        400,
      );
    }

    const totalAmount = cartItems.reduce(
      (sum, item) =>
        sum.plus(new Prisma.Decimal(item.meal.price).mul(item.quantity)),
      new Prisma.Decimal(0),
    );

    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          customerId,
          deliveryAddress,
          totalAmount,
          scheduleType: payload.scheduleType ?? "NOW",
          ...(scheduledAt ? { scheduledAt } : {}),
          ...(note ? { note } : {}),
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

  async getMyOrders(
    customerId: string,
    filters: {
      status?: OrderStatus | undefined;
      page?: number | undefined;
      limit?: number | undefined;
    },
  ) {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;

    const where: Prisma.OrderWhereInput = {
      customerId,
      ...(filters.status ? { status: filters.status } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              meal: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return {
      meta: { page, limit, total },
      data,
    };
  },

  async getIncomingOrders(
    providerId: string,
    filters: {
      status?: OrderStatus | undefined;
      page?: number | undefined;
      limit?: number | undefined;
    },
  ) {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;

    const where: Prisma.OrderWhereInput = {
      items: {
        some: {
          meal: {
            providerId,
          },
        },
      },
      ...(filters.status ? { status: filters.status } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.order.findMany({
        where,
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
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return {
      meta: { page, limit, total },
      data,
    };
  },

  async getAllOrders(filters: {
    status?: OrderStatus | undefined;
    page?: number | undefined;
    limit?: number | undefined;
  }) {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;

    const where: Prisma.OrderWhereInput = {
      ...(filters.status ? { status: filters.status } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: {
            select: { id: true, name: true, email: true },
          },
          items: {
            include: {
              meal: {
                include: {
                  provider: {
                    select: { id: true, name: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return {
      meta: { page, limit, total },
      data,
    };
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

    const hasOwnedMeal = order.items.some(
      (item) => item.meal.providerId === userId,
    );
    if (!hasOwnedMeal) {
      throw new AppError("Forbidden", 403);
    }

    return order;
  },

  async updateOrderStatus(
    userId: string,
    role: UserRole,
    orderId: string,
    status: OrderStatus,
  ) {
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
      const hasOwnedMeal = order.items.some(
        (item) => item.meal.providerId === userId,
      );
      if (!hasOwnedMeal) {
        throw new AppError("Forbidden", 403);
      }
    }

    if (role === UserRole.CUSTOMER) {
      if (order.customerId !== userId) {
        throw new AppError("Forbidden", 403);
      }

      if (
        order.status !== OrderStatus.PENDING ||
        status !== OrderStatus.CANCELED
      ) {
        throw new AppError("Customers can only cancel pending orders", 403);
      }
    } else {
      const allowed = orderStatusTransitions[order.status] ?? [];
      if (!allowed.includes(status)) {
        throw new AppError(
          `Invalid status transition from ${order.status} to ${status}`,
          400,
        );
      }
    }

    return prisma.order.update({
      where: { id: orderId },
      data: { status },
    });
  },
};
