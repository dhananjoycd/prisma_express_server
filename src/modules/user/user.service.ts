import { UserStatus } from "../../../generated/prisma/enums";
import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

export const UserService = {
  async createUser(payload: { name: string; email: string }) {
    if (!payload.name || !payload.email) {
      throw new AppError("Name and email are required", 400);
    }

    return prisma.user.create({
      data: payload,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
  },

  async getUsers(filters: {
    page?: number | undefined;
    limit?: number | undefined;
    search?: string | undefined;
    role?: "CUSTOMER" | "PROVIDER" | "ADMIN" | undefined;
    status?: UserStatus | undefined;
  }) {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;

    const where: Prisma.UserWhereInput = {};
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters.role) {
      where.role = filters.role;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          image: true,
          role: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
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

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return user;
  },

  async updateStatus(userId: string, status: UserStatus) {
    return prisma.user.update({
      where: { id: userId },
      data: { status },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });
  },

  async updateMe(
    userId: string,
    payload: {
      name?: string | undefined;
      phone?: string | undefined;
      address?: string | undefined;
      image?: string | undefined;
    },
  ) {
    const data: {
      name?: string;
      phone?: string;
      address?: string;
      image?: string;
    } = {};

    if (payload.name !== undefined) data.name = payload.name;
    if (payload.phone !== undefined) data.phone = payload.phone;
    if (payload.address !== undefined) data.address = payload.address;
    if (payload.image !== undefined) data.image = payload.image;

    return prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        phone: true,
        address: true,
        role: true,
        status: true,
      },
    });
  },
};
