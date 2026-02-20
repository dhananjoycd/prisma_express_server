import { Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import { catchAsync } from "../../utils/catchAsync";
import { getRequiredParam } from "../../utils/request";
import { OrderService } from "./order.service";
import { createOrderSchema, updateOrderStatusSchema } from "./order.validation";

export const OrderController = {
  createOrder: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const payload = createOrderSchema.parse(req.body);
    const result = await OrderService.createOrder(req.user.userId, payload);

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      data: result,
    });
  }),

  getMyOrders: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const result = await OrderService.getMyOrders(req.user.userId);

    res.status(200).json({
      success: true,
      message: "Orders retrieved successfully",
      data: result,
    });
  }),

  getIncomingOrders: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const result = await OrderService.getIncomingOrders(req.user.userId);

    res.status(200).json({
      success: true,
      message: "Incoming orders retrieved successfully",
      data: result,
    });
  }),

  getAllOrders: catchAsync(async (_req: Request, res: Response) => {
    const result = await OrderService.getAllOrders();

    res.status(200).json({
      success: true,
      message: "All orders retrieved successfully",
      data: result,
    });
  }),

  getOrderById: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const id = getRequiredParam(req.params.id, "Order id");
    const result = await OrderService.getOrderById(req.user.userId, req.user.role, id);

    res.status(200).json({
      success: true,
      message: "Order retrieved successfully",
      data: result,
    });
  }),

  updateOrderStatus: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const id = getRequiredParam(req.params.id, "Order id");

    const { status } = updateOrderStatusSchema.parse(req.body);

    const result = await OrderService.updateOrderStatus(req.user.userId, req.user.role, id, status);

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      data: result,
    });
  }),
};

