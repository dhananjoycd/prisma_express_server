import Stripe from "stripe";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

const getStripeClient = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new AppError("STRIPE_SECRET_KEY is missing", 500);
  }

  return new Stripe(secretKey);
};

export const PaymentService = {
  async createCheckoutSession(customerId: string) {
    const stripe = getStripeClient();

    const cartItems = await prisma.cartItem.findMany({
      where: { customerId },
      include: { meal: true },
    });

    if (cartItems.length === 0) {
      throw new AppError("Cart is empty", 400);
    }

    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const successUrl =
      process.env.STRIPE_SUCCESS_URL ||
      `${appUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = process.env.STRIPE_CANCEL_URL || `${appUrl}/cart`;

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
      metadata: { customerId },
    });

    return {
      sessionId: session.id,
      checkoutUrl: session.url,
    };
  },
};
