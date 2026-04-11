import { Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import { catchAsync } from "../../utils/catchAsync";
import { getRequiredParam } from "../../utils/request";
import { OrderService } from "./order.service";
import {
  createOrderSchema,
  orderListQuerySchema,
  updateOrderStatusSchema,
} from "./order.validation";
import { AuditService } from "../audit/audit.service";

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

    const filters = orderListQuerySchema.parse({
      page:
        typeof req.query.page === "string" ? Number(req.query.page) : undefined,
      limit:
        typeof req.query.limit === "string"
          ? Number(req.query.limit)
          : undefined,
      status:
        typeof req.query.status === "string" ? req.query.status : undefined,
    });

    const result = await OrderService.getMyOrders(req.user.userId, filters);

    res.status(200).json({
      success: true,
      message: "Orders retrieved successfully",
      meta: result.meta,
      data: result.data,
    });
  }),

  getIncomingOrders: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const filters = orderListQuerySchema.parse({
      page:
        typeof req.query.page === "string" ? Number(req.query.page) : undefined,
      limit:
        typeof req.query.limit === "string"
          ? Number(req.query.limit)
          : undefined,
      status:
        typeof req.query.status === "string" ? req.query.status : undefined,
    });

    const result = await OrderService.getIncomingOrders(
      req.user.userId,
      filters,
    );

    res.status(200).json({
      success: true,
      message: "Incoming orders retrieved successfully",
      meta: result.meta,
      data: result.data,
    });
  }),

  getAllOrders: catchAsync(async (req: Request, res: Response) => {
    const filters = orderListQuerySchema.parse({
      page:
        typeof req.query.page === "string" ? Number(req.query.page) : undefined,
      limit:
        typeof req.query.limit === "string"
          ? Number(req.query.limit)
          : undefined,
      status:
        typeof req.query.status === "string" ? req.query.status : undefined,
    });

    const result = await OrderService.getAllOrders(filters);

    res.status(200).json({
      success: true,
      message: "All orders retrieved successfully",
      meta: result.meta,
      data: result.data,
    });
  }),

  getOrderById: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const id = getRequiredParam(req.params.id, "Order id");
    const result = await OrderService.getOrderById(
      req.user.userId,
      req.user.role,
      id,
    );

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

    const result = await OrderService.updateOrderStatus(
      req.user.userId,
      req.user.role,
      id,
      status,
    );
    await AuditService.log({
      actorId: req.user.userId,
      actorRole: req.user.role,
      action: "ORDER_STATUS_UPDATED",
      entityType: "ORDER",
      entityId: id,
      metadata: {
        status,
      },
    });

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      data: result,
    });
  }),
};
