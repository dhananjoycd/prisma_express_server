import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

const makeSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

export const CategoryService = {
  async createCategory(payload: { name: string; description?: string | undefined; imageUrl?: string | undefined }) {
    if (!payload.name) {
      throw new AppError("Category name is required", 400);
    }

    const slug = makeSlug(payload.name);

    return prisma.category.create({
      data: {
        name: payload.name,
        slug,
        ...(payload.description !== undefined ? { description: payload.description } : {}),
        ...(payload.imageUrl !== undefined ? { imageUrl: payload.imageUrl } : {}),
      },
    });
  },

  async getCategories() {
    return prisma.category.findMany({
      orderBy: { createdAt: "desc" },
    });
  },

  async updateCategory(
    id: string,
    payload: { name?: string | undefined; description?: string | undefined; imageUrl?: string | undefined },
  ) {
    const data: { name?: string; slug?: string; description?: string | null; imageUrl?: string | null } = {};

    if (payload.name !== undefined) {
      data.name = payload.name;
      data.slug = makeSlug(payload.name);
    }

    if (payload.description !== undefined) {
      data.description = payload.description;
    }
    if (payload.imageUrl !== undefined) {
      data.imageUrl = payload.imageUrl;
    }

    return prisma.category.update({
      where: { id },
      data,
    });
  },

  async deleteCategory(id: string) {
    return prisma.category.delete({ where: { id } });
  },
};

