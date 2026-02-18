import { UserStatus } from "../../../generated/prisma/enums";
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

  async getUsers() {
    return prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
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
