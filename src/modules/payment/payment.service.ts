import Stripe from "stripe";
import { PaymentStatus } from "../../../generated/prisma/enums.js";
import { Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { AuditService } from "../audit/audit.service";

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
  scheduleType?: "NOW" | "LATER" | undefined;
  scheduledAt?: string | undefined;
  successUrl?: string | undefined;
  cancelUrl?: string | undefined;
};

const resolveScheduledAt = (
  scheduleType: "NOW" | "LATER",
  scheduledAtRaw?: string,
) => {
  if (scheduleType !== "LATER") {
    return undefined;
  }

  if (!scheduledAtRaw?.trim()) {
    throw new AppError(
      "scheduledAt is required when scheduleType is LATER",
      400,
    );
  }

  const scheduledAt = new Date(scheduledAtRaw);
  if (Number.isNaN(scheduledAt.getTime())) {
    throw new AppError("scheduledAt must be a valid datetime", 400);
  }

  if (scheduledAt.getTime() <= Date.now()) {
    throw new AppError("scheduledAt must be in the future", 400);
  }

  return scheduledAt;
};

export const PaymentService = {
  async createCheckoutSession(
    customerId: string,
    payload: CreateCheckoutPayload,
  ) {
    const stripe = getStripeClient();

    const deliveryAddress = payload.deliveryAddress?.trim();
    if (!deliveryAddress) {
      throw new AppError("deliveryAddress is required", 400);
    }

    const scheduleType = payload.scheduleType === "LATER" ? "LATER" : "NOW";
    const scheduledAt = resolveScheduledAt(scheduleType, payload.scheduledAt);

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
    const cancelUrl =
      payload.cancelUrl?.trim() ||
      process.env.STRIPE_CANCEL_URL ||
      `${appUrl}/cart`;

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
      cartItems.map((item) => {
        const productData: Stripe.Checkout.SessionCreateParams.LineItem.PriceData.ProductData =
          {
            name: item.meal.title,
            ...(item.meal.description
              ? { description: item.meal.description }
              : {}),
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
        deliveryAddress,
        scheduleType,
        ...(scheduledAt ? { scheduledAt: scheduledAt.toISOString() } : {}),
        ...(payload.note?.trim() ? { note: payload.note.trim() } : {}),
      },
    });

    return {
      sessionId: session.id,
      checkoutUrl: session.url,
    };
  },

  async confirmCheckoutSession(customerId: string, sessionId: string) {
    const normalizedSessionId = sessionId?.trim();
    if (!normalizedSessionId) {
      throw new AppError("sessionId is required", 400);
    }

    const existingOrder = await prisma.order.findUnique({
      where: { paymentReference: normalizedSessionId },
      include: {
        items: {
          include: {
            meal: true,
          },
        },
      },
    });

    if (existingOrder) {
      return {
        sessionId: normalizedSessionId,
        paymentStatus: PaymentStatus.PAID.toLowerCase(),
        created: false,
        order: existingOrder,
      };
    }

    const stripe = getStripeClient();
    const session =
      await stripe.checkout.sessions.retrieve(normalizedSessionId);

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
    const scheduledAt = resolveScheduledAt(
      scheduleType,
      session.metadata?.scheduledAt?.trim(),
    );

    const result = await prisma.$transaction(async (tx) => {
      const orderByReference = await tx.order.findUnique({
        where: { paymentReference: normalizedSessionId },
        include: {
          items: {
            include: {
              meal: true,
            },
          },
        },
      });

      if (orderByReference) {
        return {
          created: false,
          order: orderByReference,
        };
      }

      const cartItems = await tx.cartItem.findMany({
        where: { customerId },
        include: { meal: true },
      });

      if (cartItems.length === 0) {
        throw new AppError(
          "Cart is empty and no order was found for this payment session",
          409,
        );
      }

      const providerIds = new Set(
        cartItems.map((item) => item.meal.providerId),
      );
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

      const order = await tx.order.create({
        data: {
          customerId,
          deliveryAddress,
          totalAmount,
          paymentStatus: PaymentStatus.PAID,
          paymentProvider: "stripe",
          paymentReference: normalizedSessionId,
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

  async handleStripeWebhook(rawBody: Buffer, signature?: string) {
    if (!signature) {
      throw new AppError("Stripe signature header is missing", 400);
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new AppError("STRIPE_WEBHOOK_SECRET is missing", 500);
    }

    const stripe = getStripeClient();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (_error) {
      throw new AppError("Invalid Stripe webhook signature", 400);
    }

    if (event.type !== "checkout.session.completed") {
      await AuditService.log({
        actorRole: "SYSTEM",
        action: "STRIPE_WEBHOOK_IGNORED",
        entityType: "PAYMENT",
        entityId: event.id,
        metadata: {
          eventType: event.type,
        },
      });

      return {
        eventId: event.id,
        eventType: event.type,
        processed: false,
      };
    }

    const checkoutSession = event.data.object as Stripe.Checkout.Session;
    const sessionId = checkoutSession.id?.trim();
    const customerId = checkoutSession.metadata?.customerId?.trim();

    if (!sessionId || !customerId) {
      await AuditService.log({
        actorRole: "SYSTEM",
        action: "STRIPE_WEBHOOK_INVALID",
        entityType: "PAYMENT",
        entityId: event.id,
        metadata: {
          reason: "Missing sessionId or customerId",
        },
      });

      return {
        eventId: event.id,
        eventType: event.type,
        processed: false,
      };
    }

    const syncResult = await this.confirmCheckoutSession(customerId, sessionId);

    await AuditService.log({
      actorId: customerId,
      actorRole: "CUSTOMER",
      action: "PAYMENT_CONFIRMED",
      entityType: "ORDER",
      entityId: String(syncResult.order?.id ?? sessionId),
      metadata: {
        sessionId,
        created: syncResult.created,
        eventId: event.id,
      },
    });

    return {
      eventId: event.id,
      eventType: event.type,
      processed: true,
      synced: syncResult,
    };
  },
};
