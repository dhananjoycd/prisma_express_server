import { Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import { catchAsync } from "../../utils/catchAsync";
import { PaymentService } from "./payment.service";

export const PaymentController = {
  createCheckoutSession: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const data = await PaymentService.createCheckoutSession(req.user.userId, req.body);

    res.status(200).json({
      success: true,
      message: "Checkout session created",
      data,
    });
  }),

  confirmCheckoutSession: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const sessionId = String((req.body as { sessionId?: unknown })?.sessionId ?? "").trim();
    if (!sessionId) {
      throw new AppError("sessionId is required", 400);
    }

    const data = await PaymentService.confirmCheckoutSession(req.user.userId, sessionId);

    res.status(200).json({
      success: true,
      message: "Payment verified and order synced",
      data,
    });
  }),
};
