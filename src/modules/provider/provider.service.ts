import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

type ProviderFilters = {
  search?: string;
  cuisine?: string;
};

export const ProviderService = {
  async getProviders(filters: ProviderFilters) {
    return prisma.providerProfile.findMany({
      where: {
        ...(filters.cuisine ? { cuisine: { contains: filters.cuisine, mode: "insensitive" } } : {}),
        ...(filters.search
          ? {
              OR: [
                { restaurantName: { contains: filters.search, mode: "insensitive" } },
                { description: { contains: filters.search, mode: "insensitive" } },
                { user: { name: { contains: filters.search, mode: "insensitive" } } },
              ],
            }
          : {}),
        user: {
          status: "ACTIVE",
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            meals: {
              where: { isAvailable: true },
              select: { id: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async getProviderById(providerId: string) {
    const provider = await prisma.providerProfile.findUnique({
      where: { userId: providerId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            meals: {
              where: { isAvailable: true },
              include: {
                category: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                },
              },
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });

    if (!provider) {
      throw new AppError("Provider not found", 404);
    }

    return provider;
  },
};

