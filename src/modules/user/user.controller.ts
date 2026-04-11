import { Request, Response } from "express";
import { UserService } from "./user.service";
import { catchAsync } from "../../utils/catchAsync";
import { AppError } from "../../utils/AppError";
import { getRequiredParam } from "../../utils/request";
import {
  updateMeSchema,
  updateUserStatusSchema,
  userListQuerySchema,
} from "./user.validation";
import { AuditService } from "../audit/audit.service";

export const UserController = {
  createUser: catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.createUser(req.body);

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: result,
    });
  }),

  getUsers: catchAsync(async (req: Request, res: Response) => {
    const filters = userListQuerySchema.parse({
      page:
        typeof req.query.page === "string" ? Number(req.query.page) : undefined,
      limit:
        typeof req.query.limit === "string"
          ? Number(req.query.limit)
          : undefined,
      search:
        typeof req.query.search === "string" ? req.query.search : undefined,
      role: typeof req.query.role === "string" ? req.query.role : undefined,
      status:
        typeof req.query.status === "string" ? req.query.status : undefined,
    });

    const result = await UserService.getUsers(filters);

    res.status(200).json({
      success: true,
      message: "Users retrieved successfully",
      meta: result.meta,
      data: result.data,
    });
  }),

  getMe: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const result = await UserService.getMe(req.user.userId);

    res.status(200).json({
      success: true,
      message: "User profile retrieved successfully",
      data: result,
    });
  }),

  updateStatus: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const id = getRequiredParam(req.params.id, "User id");
    const { status } = updateUserStatusSchema.parse(req.body);

    const result = await UserService.updateStatus(id, status);
    await AuditService.log({
      actorId: req.user.userId,
      actorRole: req.user.role,
      action: "USER_STATUS_UPDATED",
      entityType: "USER",
      entityId: id,
      metadata: {
        status,
      },
    });

    res.status(200).json({
      success: true,
      message: "User status updated successfully",
      data: result,
    });
  }),

  updateMe: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const payload = updateMeSchema.parse(req.body);
    const result = await UserService.updateMe(req.user.userId, payload);

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: result,
    });
  }),
};
