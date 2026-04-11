import { UserRole } from "../../../generated/prisma/enums.js";
import { Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma";

type CreateAuditLogPayload = {
  actorId?: string | undefined;
  actorRole?: UserRole | string | undefined;
  action: string;
  entityType: string;
  entityId?: string | undefined;
  metadata?: Prisma.InputJsonValue | undefined;
};

type GetAuditLogsFilters = {
  actorId?: string | undefined;
  action?: string | undefined;
  entityType?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
};

export const AuditService = {
  async log(payload: CreateAuditLogPayload) {
    return prisma.auditLog.create({
      data: {
        ...(payload.actorId ? { actorId: payload.actorId } : {}),
        ...(payload.actorRole ? { actorRole: String(payload.actorRole) } : {}),
        action: payload.action,
        entityType: payload.entityType,
        ...(payload.entityId ? { entityId: payload.entityId } : {}),
        ...(payload.metadata !== undefined
          ? { metadata: payload.metadata }
          : {}),
      },
    });
  },

  async getLogs(
    role: UserRole,
    requesterId: string,
    filters: GetAuditLogsFilters,
  ) {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;

    const where: Prisma.AuditLogWhereInput = {};

    if (role === UserRole.PROVIDER) {
      where.actorId = requesterId;
    } else if (filters.actorId) {
      where.actorId = filters.actorId;
    }

    if (filters.action) {
      where.action = { contains: filters.action, mode: "insensitive" };
    }

    if (filters.entityType) {
      where.entityType = { contains: filters.entityType, mode: "insensitive" };
    }

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      meta: {
        page,
        limit,
        total,
      },
      data,
    };
  },
};
