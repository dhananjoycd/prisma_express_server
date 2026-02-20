import { NextFunction, Request, Response } from "express";
import { UserRole, UserStatus } from "../../generated/prisma/enums.js";
import { auth as betterAuth } from "../lib/better-auth";
import { AppError } from "../utils/AppError";
import { toFetchHeaders } from "../utils/http";

const toRole = (role: unknown): UserRole => {
  if (role === UserRole.ADMIN) {
    return UserRole.ADMIN;
  }

  if (role === UserRole.PROVIDER) {
    return UserRole.PROVIDER;
  }

  return UserRole.CUSTOMER;
};

const toStatus = (status: unknown): UserStatus => {
  if (status === UserStatus.SUSPENDED) {
    return UserStatus.SUSPENDED;
  }

  return UserStatus.ACTIVE;
};

export const auth = (...roles: UserRole[]) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const session = await betterAuth.api.getSession({
      headers: toFetchHeaders(req),
    });

    if (!session?.user) {
      return next(new AppError("Unauthorized", 401));
    }

    const role = toRole((session.user as Record<string, unknown>).role);
    const status = toStatus((session.user as Record<string, unknown>).status);

    if (status === UserStatus.SUSPENDED) {
      return next(new AppError("Your account is suspended", 403));
    }

    req.user = {
      userId: session.user.id,
      role,
      status,
    };

    if (roles.length > 0 && !roles.includes(role)) {
      return next(new AppError("Forbidden", 403));
    }

    return next();
  };
};

