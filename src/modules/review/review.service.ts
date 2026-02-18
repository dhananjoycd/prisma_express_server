import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

type CreateReviewPayload = {
  mealId: string;
  rating: number;
  comment?: string | undefined;
};

export const ReviewService = {
  async createReview(customerId: string, payload: CreateReviewPayload) {
    const { mealId, rating, comment } = payload;

    if (!mealId || rating === undefined) {
      throw new AppError("mealId and rating are required", 400);
    }

    if (rating < 1 || rating > 5) {
      throw new AppError("Rating must be between 1 and 5", 400);
    }

    const deliveredOrder = await prisma.order.findFirst({
      where: {
        customerId,
        status: "DELIVERED",
        items: {
          some: {
            mealId,
          },
        },
      },
    });

    if (!deliveredOrder) {
      throw new AppError("You can review only delivered meals", 403);
    }

    return prisma.review.upsert({
      where: {
        customerId_mealId: {
          customerId,
          mealId,
        },
      },
      update: {
        rating,
        ...(comment !== undefined ? { comment } : {}),
      },
      create: {
        customerId,
        mealId,
        rating,
        ...(comment !== undefined ? { comment } : {}),
      },
      include: {
        customer: {
          select: { id: true, name: true },
        },
      },
    });
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
