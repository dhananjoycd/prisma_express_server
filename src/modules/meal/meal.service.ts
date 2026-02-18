import { UserRole } from "../../../generated/prisma/enums";
import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

type CreateMealPayload = {
  categoryId: string;
  title: string;
  description?: string | undefined;
  price: number;
  imageUrl?: string | undefined;
  isAvailable?: boolean | undefined;
};

type UpdateMealPayload = {
  categoryId?: string | undefined;
  title?: string | undefined;
  description?: string | undefined;
  price?: number | undefined;
  imageUrl?: string | undefined;
  isAvailable?: boolean | undefined;
};

type MealFilters = {
  categoryId?: string | undefined;
  providerId?: string | undefined;
  search?: string | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  page?: number | undefined;
  limit?: number | undefined;
};

export const MealService = {
  async createMeal(providerId: string, payload: CreateMealPayload) {
    const { categoryId, title, price } = payload;

    if (!categoryId || !title || price === undefined) {
      throw new AppError("categoryId, title and price are required", 400);
    }

    return prisma.meal.create({
      data: {
        providerId,
        categoryId,
        title,
        price: new Prisma.Decimal(payload.price),
        ...(payload.description !== undefined ? { description: payload.description } : {}),
        ...(payload.imageUrl !== undefined ? { imageUrl: payload.imageUrl } : {}),
        ...(payload.isAvailable !== undefined ? { isAvailable: payload.isAvailable } : {}),
      },
    });
  },

  async getMeals(filters: MealFilters) {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 10;

    const where: Prisma.MealWhereInput = {
      isAvailable: true,
    };

    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.providerId) where.providerId = filters.providerId;
    if (filters.search) {
      where.title = { contains: filters.search, mode: "insensitive" };
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.price = {};
      if (filters.minPrice !== undefined) {
        where.price.gte = new Prisma.Decimal(filters.minPrice);
      }
      if (filters.maxPrice !== undefined) {
        where.price.lte = new Prisma.Decimal(filters.maxPrice);
      }
    }

    const [items, total] = await Promise.all([
      prisma.meal.findMany({
        where,
        include: {
          category: true,
          provider: {
            select: { id: true, name: true, email: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.meal.count({ where }),
    ]);

    return {
      meta: {
        page,
        limit,
        total,
      },
      data: items,
    };
  },

  async getMealById(id: string) {
    const meal = await prisma.meal.findUnique({
      where: { id },
      include: {
        category: true,
        provider: {
          select: { id: true, name: true, email: true },
        },
        reviews: {
          include: {
            customer: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!meal) {
      throw new AppError("Meal not found", 404);
    }

    return meal;
  },

  async updateMeal(userId: string, role: UserRole, mealId: string, payload: UpdateMealPayload) {
    const meal = await prisma.meal.findUnique({ where: { id: mealId } });
    if (!meal) {
      throw new AppError("Meal not found", 404);
    }

    if (role !== UserRole.ADMIN && meal.providerId !== userId) {
      throw new AppError("Forbidden", 403);
    }

    return prisma.meal.update({
      where: { id: mealId },
      data: {
        ...(payload.categoryId !== undefined ? { categoryId: payload.categoryId } : {}),
        ...(payload.title !== undefined ? { title: payload.title } : {}),
        ...(payload.description !== undefined ? { description: payload.description } : {}),
        ...(payload.price !== undefined ? { price: new Prisma.Decimal(payload.price) } : {}),
        ...(payload.imageUrl !== undefined ? { imageUrl: payload.imageUrl } : {}),
        ...(payload.isAvailable !== undefined ? { isAvailable: payload.isAvailable } : {}),
      },
    });
  },

  async deleteMeal(userId: string, role: UserRole, mealId: string) {
    const meal = await prisma.meal.findUnique({ where: { id: mealId } });
    if (!meal) {
      throw new AppError("Meal not found", 404);
    }

    if (role !== UserRole.ADMIN && meal.providerId !== userId) {
      throw new AppError("Forbidden", 403);
    }

    await prisma.meal.delete({ where: { id: mealId } });
  },

  async getMealReviews(mealId: string) {
    return prisma.review.findMany({
      where: { mealId },
      include: {
        customer: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },
};
