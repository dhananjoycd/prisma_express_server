import { Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import { catchAsync } from "../../utils/catchAsync";
import { PaymentService } from "./payment.service";

export const PaymentController = {
  createCheckoutSession: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const data = await PaymentService.createCheckoutSession(req.user.userId);

    res.status(200).json({
      success: true,
      message: "Checkout session created",
      data,
    });
  }),
};
