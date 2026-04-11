import { Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import { catchAsync } from "../../utils/catchAsync";
import { PaymentService } from "./payment.service";
import {
  createCheckoutSchema,
  confirmCheckoutSchema,
} from "./payment.validation";

export const PaymentController = {
  createCheckoutSession: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const payload = createCheckoutSchema.parse(req.body);
    const data = await PaymentService.createCheckoutSession(
      req.user.userId,
      payload,
    );

    res.status(200).json({
      success: true,
      message: "Checkout session created",
      data,
    });
  }),

  confirmCheckoutSession: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const { sessionId } = confirmCheckoutSchema.parse(req.body);

    const data = await PaymentService.confirmCheckoutSession(
      req.user.userId,
      sessionId,
    );

    res.status(200).json({
      success: true,
      message: "Payment verified and order synced",
      data,
    });
  }),

  handleStripeWebhook: catchAsync(async (req: Request, res: Response) => {
    const signatureHeader = req.headers["stripe-signature"];
    const signature =
      typeof signatureHeader === "string" ? signatureHeader : undefined;

    const body = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(JSON.stringify(req.body ?? {}), "utf-8");

    const data = await PaymentService.handleStripeWebhook(body, signature);

    res.status(200).json({
      success: true,
      message: "Stripe webhook received",
      data,
    });
  }),
};
