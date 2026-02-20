import { Request, Response } from "express";
import { UserService } from "./user.service";
import { catchAsync } from "../../utils/catchAsync";
import { AppError } from "../../utils/AppError";
import { getRequiredParam } from "../../utils/request";
import { updateMeSchema, updateUserStatusSchema } from "./user.validation";

export const UserController = {
  createUser: catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.createUser(req.body);

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: result,
    });
  }),

  getUsers: catchAsync(async (_req: Request, res: Response) => {
    const result = await UserService.getUsers();

    res.status(200).json({
      success: true,
      message: "Users retrieved successfully",
      data: result,
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
    const id = getRequiredParam(req.params.id, "User id");
    const { status } = updateUserStatusSchema.parse(req.body);

    const result = await UserService.updateStatus(id, status);

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

