import Stripe from "stripe";
import { PaymentStatus } from "../../../generated/prisma/enums.js";
import { Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

const getStripeClient = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new AppError("STRIPE_SECRET_KEY is missing", 500);
  }

  return new Stripe(secretKey);
};

type CreateCheckoutPayload = {
  deliveryAddress: string;
  note?: string | undefined;
  scheduleType?: "NOW" | "LATER";
  scheduledAt?: string | undefined;
  successUrl?: string | undefined;
  cancelUrl?: string | undefined;
};

export const PaymentService = {
  async createCheckoutSession(customerId: string, payload: CreateCheckoutPayload) {
    const stripe = getStripeClient();

    if (!payload.deliveryAddress?.trim()) {
      throw new AppError("deliveryAddress is required", 400);
    }

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

    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const successUrl =
      payload.successUrl?.trim() ||
      process.env.STRIPE_SUCCESS_URL ||
      `${appUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = payload.cancelUrl?.trim() || process.env.STRIPE_CANCEL_URL || `${appUrl}/cart`;

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = cartItems.map((item) => {
      const productData: Stripe.Checkout.SessionCreateParams.LineItem.PriceData.ProductData = {
        name: item.meal.title,
        ...(item.meal.description ? { description: item.meal.description } : {}),
      };

      return {
        quantity: item.quantity,
        price_data: {
          currency: "usd",
          product_data: productData,
          unit_amount: Math.round(Number(item.meal.price) * 100),
        },
      };
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: lineItems,
      metadata: {
        customerId,
        deliveryAddress: payload.deliveryAddress.trim(),
        scheduleType: payload.scheduleType ?? "NOW",
        ...(payload.scheduledAt ? { scheduledAt: payload.scheduledAt } : {}),
        ...(payload.note?.trim() ? { note: payload.note.trim() } : {}),
      },
    });

    return {
      sessionId: session.id,
      checkoutUrl: session.url,
    };
  },

  async confirmCheckoutSession(customerId: string, sessionId: string) {
    if (!sessionId?.trim()) {
      throw new AppError("sessionId is required", 400);
    }

    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      throw new AppError("Stripe session not found", 404);
    }

    if (session.payment_status !== "paid") {
      throw new AppError("Payment is not completed yet", 400);
    }

    if (session.metadata?.customerId !== customerId) {
      throw new AppError("Forbidden", 403);
    }

    const deliveryAddress = session.metadata?.deliveryAddress?.trim();
    if (!deliveryAddress) {
      throw new AppError("Missing deliveryAddress in checkout session", 400);
    }

    const note = session.metadata?.note?.trim() || undefined;
    const scheduleType =
      session.metadata?.scheduleType === "LATER" ? "LATER" : "NOW";
    const scheduledAtRaw = session.metadata?.scheduledAt?.trim();
    const scheduledAt =
      scheduledAtRaw && scheduleType === "LATER" ? new Date(scheduledAtRaw) : undefined;

    const result = await prisma.$transaction(async (tx) => {
      const cartItems = await tx.cartItem.findMany({
        where: { customerId },
        include: { meal: true },
      });

      if (cartItems.length === 0) {
        const latestPaidOrder = await tx.order.findFirst({
          where: { customerId, paymentStatus: PaymentStatus.PAID },
          include: {
            items: {
              include: {
                meal: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        return {
          created: false,
          order: latestPaidOrder,
        };
      }

      const providerIds = new Set(cartItems.map((item) => item.meal.providerId));
      if (providerIds.size > 1) {
        throw new AppError(
          "You can order from one provider at a time. Please split your cart.",
          400,
        );
      }

      const totalAmount = cartItems.reduce(
        (sum, item) => sum.plus(new Prisma.Decimal(item.meal.price).mul(item.quantity)),
        new Prisma.Decimal(0),
      );

      const order = await tx.order.create({
        data: {
          customerId,
          deliveryAddress,
          totalAmount,
          paymentStatus: PaymentStatus.PAID,
          scheduleType,
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

      return {
        created: true,
        order,
      };
    });

    return {
      sessionId: session.id,
      paymentStatus: session.payment_status,
      ...result,
    };
  },
};
