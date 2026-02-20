import { UserRole, UserStatus } from "../../generated/prisma/enums.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: UserRole;
        status: UserStatus;
      };
    }
  }
}

export {};

