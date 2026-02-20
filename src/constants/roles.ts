import { UserRole } from "../../generated/prisma/enums.js";

export const userRoles = {
  ADMIN: UserRole.ADMIN,
  CUSTOMER: UserRole.CUSTOMER,
  PROVIDER: UserRole.PROVIDER,
} as const;

