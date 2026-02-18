import { UserRole } from "../../generated/prisma/enums";

export const userRoles = {
  ADMIN: UserRole.ADMIN,
  CUSTOMER: UserRole.CUSTOMER,
  PROVIDER: UserRole.PROVIDER,
} as const;
