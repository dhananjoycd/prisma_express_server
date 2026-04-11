import { Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import { catchAsync } from "../../utils/catchAsync";
import { AuditService } from "./audit.service";
import { auditQuerySchema } from "./audit.validation";

export const AuditController = {
  getLogs: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const query = {
      actorId:
        typeof req.query.actorId === "string" ? req.query.actorId : undefined,
      action:
        typeof req.query.action === "string" ? req.query.action : undefined,
      entityType:
        typeof req.query.entityType === "string"
          ? req.query.entityType
          : undefined,
      page:
        typeof req.query.page === "string" ? Number(req.query.page) : undefined,
      limit:
        typeof req.query.limit === "string"
          ? Number(req.query.limit)
          : undefined,
    };

    const filters = auditQuerySchema.parse(query);
    const result = await AuditService.getLogs(
      req.user.role,
      req.user.userId,
      filters,
    );

    res.status(200).json({
      success: true,
      message: "Audit logs retrieved successfully",
      ...result,
    });
  }),
};
