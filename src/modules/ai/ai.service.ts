import { Prisma } from "../../../generated/prisma/client.js";
import { z } from "zod";
import { LlmService } from "../../lib/llm";
import { prisma } from "../../lib/prisma";

type RecommendMealsParams = {
  userId: string | undefined;
  mealId: string | undefined;
  limit: number | undefined;
  excludeIds: string[] | undefined;
};

type MealSearchParams = {
  userId: string | undefined;
  query: string;
  limit: number | undefined;
};

type MealReviewSummaryParams = {
  mealId: string;
};

type SupportChatParams = {
  message: string;
  userId?: string;
};

type RecommendationSignal =
  | "personal_history"
  | "similar_meal"
  | "popular_pick"
  | "budget_match";

type CandidateMeal = Prisma.MealGetPayload<{
  include: {
    category: true;
    provider: true;
    reviews: true;
  };
}>;

type ScoredRecommendation = {
  meal: CandidateMeal;
  score: number;
  signal: RecommendationSignal;
  reason: string;
};

type ParsedMealSearchQuery = {
  normalizedQuery: string;
  terms: string[];
  minPrice: number | null;
  maxPrice: number | null;
  intents: {
    budget: boolean;
    premium: boolean;
    healthy: boolean;
    spicy: boolean;
    sweet: boolean;
    proteinRich: boolean;
  };
};

type SearchResultSignal =
  | "text_match"
  | "budget_match"
  | "premium_match"
  | "personalized_match";

type LlmParsedMealSearch = {
  terms?: string[];
  minPrice?: number | null;
  maxPrice?: number | null;
  intents?: Partial<ParsedMealSearchQuery["intents"]>;
};

type LlmReviewSummaryRewrite = {
  summary?: string;
  highlights?: string[];
  concerns?: string[];
  recommendation?: string;
};

type LlmSupportChat = {
  reply?: string;
  intent?: string;
  suggestions?: string[];
  escalate?: boolean;
};

type ReviewTheme = {
  label: string;
  positiveKeywords: string[];
  negativeKeywords: string[];
};

type AiMealReviewSummary = {
  mealId: string;
  mealTitle: string;
  reviewCount: number;
  averageRating: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  summary: string;
  highlights: string[];
  concerns: string[];
  themes: Array<{
    label: string;
    mentions: number;
    sentiment: "positive" | "negative";
  }>;
  recommendation: string;
};

const llmMealSearchSchema = z.object({
  terms: z.array(z.string()).default([]),
  minPrice: z.number().nullable().optional(),
  maxPrice: z.number().nullable().optional(),
  intents: z
    .object({
      budget: z.boolean().optional(),
      premium: z.boolean().optional(),
      healthy: z.boolean().optional(),
      spicy: z.boolean().optional(),
      sweet: z.boolean().optional(),
      proteinRich: z.boolean().optional(),
    })
    .optional(),
});

const llmReviewSummarySchema = z.object({
  summary: z.string().min(20).max(420).optional(),
  highlights: z.array(z.string().min(4).max(120)).max(3).optional(),
  concerns: z.array(z.string().min(4).max(120)).max(3).optional(),
  recommendation: z.string().min(8).max(160).optional(),
});

const llmSupportSchema = z.object({
  reply: z.string().min(10).max(400).optional(),
  intent: z.string().min(2).max(40).optional(),
  suggestions: z.array(z.string().min(2).max(120)).max(3).optional(),
  escalate: z.boolean().optional(),
});

const decimalToNumber = (
  value: Prisma.Decimal | number | string | null | undefined,
) => Number(value ?? 0);

const clampLimit = (value?: number) => {
  if (!value || !Number.isFinite(value)) return 6;
  return Math.min(Math.max(Math.trunc(value), 1), 12);
};

const average = (values: number[]) => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const overlapCount = (a: string[] = [], b: string[] = []) => {
  const other = new Set(b.map((item) => item.toLowerCase()));
  return a.filter((item) => other.has(item.toLowerCase())).length;
};

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const findFirstNumber = (value: string, pattern: RegExp) => {
  const match = value.match(pattern);
  if (!match) return null;
  const parsed = Number(match[1]);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
};

const searchStopWords = new Set([
  "i",
  "me",
  "my",
  "want",
  "wants",
  "need",
  "looking",
  "for",
  "with",
  "and",
  "or",
  "to",
  "a",
  "an",
  "the",
  "show",
  "find",
  "get",
  "meal",
  "meals",
  "food",
  "please",
  "something",
]);

const reviewThemes: ReviewTheme[] = [
  {
    label: "taste",
    positiveKeywords: [
      "tasty",
      "delicious",
      "flavorful",
      "flavourful",
      "yummy",
      "great taste",
      "good taste",
    ],
    negativeKeywords: [
      "bland",
      "tasteless",
      "boring",
      "bad taste",
      "off taste",
    ],
  },
  {
    label: "portion size",
    positiveKeywords: [
      "filling",
      "generous",
      "big portion",
      "enough",
      "well served",
    ],
    negativeKeywords: [
      "small portion",
      "tiny portion",
      "less quantity",
      "not enough",
    ],
  },
  {
    label: "freshness",
    positiveKeywords: ["fresh", "freshly", "warm", "hot", "made fresh"],
    negativeKeywords: ["stale", "cold", "old", "not fresh"],
  },
  {
    label: "delivery",
    positiveKeywords: [
      "on time",
      "fast delivery",
      "quick",
      "prompt",
      "arrived fast",
    ],
    negativeKeywords: ["late", "slow", "delayed", "took too long"],
  },
  {
    label: "packaging",
    positiveKeywords: [
      "well packed",
      "sealed",
      "clean packaging",
      "good packaging",
    ],
    negativeKeywords: ["leak", "messy", "broken", "poor packaging"],
  },
  {
    label: "value",
    positiveKeywords: [
      "worth",
      "affordable",
      "budget",
      "good value",
      "worth it",
    ],
    negativeKeywords: ["expensive", "overpriced", "not worth"],
  },
  {
    label: "spice level",
    positiveKeywords: ["spicy", "well spiced", "perfect spice"],
    negativeKeywords: [
      "too spicy",
      "less spicy",
      "not spicy enough",
      "over spiced",
    ],
  },
];

const parseMealSearchQuery = (query: string): ParsedMealSearchQuery => {
  const normalizedQuery = normalizeText(query);
  const rawTerms = normalizedQuery
    .split(" ")
    .map((item) => item.trim())
    .filter((item) => item.length > 1 && !searchStopWords.has(item));
  const terms = Array.from(new Set(rawTerms)).slice(0, 8);

  const maxPrice =
    findFirstNumber(
      normalizedQuery,
      /(?:under|below|max|upto|up to)\s*(\d+(?:\.\d+)?)/i,
    ) ?? findFirstNumber(normalizedQuery, /(?:less than)\s*(\d+(?:\.\d+)?)/i);
  const minPrice =
    findFirstNumber(
      normalizedQuery,
      /(?:above|over|min|at least|more than)\s*(\d+(?:\.\d+)?)/i,
    ) ?? null;

  return {
    normalizedQuery,
    terms,
    minPrice,
    maxPrice,
    intents: {
      budget: /\b(cheap|budget|affordable|low price|low-cost)\b/i.test(
        normalizedQuery,
      ),
      premium: /\b(premium|fancy|luxury|expensive|high end|gourmet)\b/i.test(
        normalizedQuery,
      ),
      healthy: /\b(healthy|light|clean|nutritious|diet|fresh)\b/i.test(
        normalizedQuery,
      ),
      spicy: /\b(spicy|hot|chili|chilli|masala)\b/i.test(normalizedQuery),
      sweet: /\b(sweet|dessert|sugary)\b/i.test(normalizedQuery),
      proteinRich: /\b(protein|high-protein|gym|fit)\b/i.test(normalizedQuery),
    },
  };
};

const boolOrFallback = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

const sanitizeTerms = (value: unknown) => {
  if (!Array.isArray(value)) return [] as string[];
  return value
    .map((item) => (typeof item === "string" ? normalizeText(item) : ""))
    .filter(Boolean)
    .slice(0, 10);
};

const asNullableNumber = (value: unknown) => {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
};

const parseMealSearchQueryWithLlm = async (query: string) => {
  const json = await LlmService.json<LlmParsedMealSearch>({
    systemPrompt:
      "You are a strict parser for a food app. Return valid JSON only with keys: terms (string[]), minPrice (number|null), maxPrice (number|null), intents ({budget,premium,healthy,spicy,sweet,proteinRich} booleans). Use null for unknown prices and false for unknown intents. Do not add extra keys or markdown.",
    userPrompt: `User search query: ${query}`,
    maxTokens: 260,
    temperature: 0,
    cacheTtlMs: 10 * 60 * 1000,
  });

  if (!json) return null;

  const validated = llmMealSearchSchema.safeParse(json);
  if (!validated.success) {
    return null;
  }

  const intents = validated.data.intents ?? {};
  return {
    terms: sanitizeTerms(validated.data.terms),
    minPrice: asNullableNumber(validated.data.minPrice),
    maxPrice: asNullableNumber(validated.data.maxPrice),
    intents: {
      budget: boolOrFallback(intents.budget, false),
      premium: boolOrFallback(intents.premium, false),
      healthy: boolOrFallback(intents.healthy, false),
      spicy: boolOrFallback(intents.spicy, false),
      sweet: boolOrFallback(intents.sweet, false),
      proteinRich: boolOrFallback(intents.proteinRich, false),
    },
  };
};

const textIncludes = (source: string, term: string) => source.includes(term);

const countMatchedKeywords = (text: string, keywords: string[]) =>
  keywords.reduce(
    (count, keyword) =>
      count + (textIncludes(text, normalizeText(keyword)) ? 1 : 0),
    0,
  );

const summarizeMealReviews = (meal: {
  id: string;
  title: string;
  reviews: Array<{ rating: number; comment?: string | null }>;
}): AiMealReviewSummary => {
  const reviewCount = meal.reviews.length;
  const averageRating = average(meal.reviews.map((review) => review.rating));
  const positiveCount = meal.reviews.filter(
    (review) => review.rating >= 4,
  ).length;
  const neutralCount = meal.reviews.filter(
    (review) => review.rating === 3,
  ).length;
  const negativeCount = meal.reviews.filter(
    (review) => review.rating <= 2,
  ).length;

  if (reviewCount === 0) {
    return {
      mealId: meal.id,
      mealTitle: meal.title,
      reviewCount: 0,
      averageRating: 0,
      positiveCount: 0,
      neutralCount: 0,
      negativeCount: 0,
      summary: "No reviews have been submitted for this meal yet.",
      highlights: [],
      concerns: [],
      themes: [],
      recommendation: "Be among the first customers to leave a review.",
    };
  }

  const positiveThemeCounts = new Map<string, number>();
  const negativeThemeCounts = new Map<string, number>();

  for (const review of meal.reviews) {
    const commentText = normalizeText(review.comment ?? "");
    if (!commentText) continue;

    for (const theme of reviewThemes) {
      if (countMatchedKeywords(commentText, theme.positiveKeywords) > 0) {
        positiveThemeCounts.set(
          theme.label,
          (positiveThemeCounts.get(theme.label) ?? 0) + 1,
        );
      }
      if (countMatchedKeywords(commentText, theme.negativeKeywords) > 0) {
        negativeThemeCounts.set(
          theme.label,
          (negativeThemeCounts.get(theme.label) ?? 0) + 1,
        );
      }
    }
  }

  const positiveThemes = Array.from(positiveThemeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const negativeThemes = Array.from(negativeThemeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const highlights = positiveThemes.map(
    ([label]) => `Customers praise ${label}.`,
  );
  const concerns = negativeThemes.map(
    ([label]) => `Some customers mention ${label}.`,
  );

  const positiveSnippets = positiveThemes.map(([label]) => label).join(", ");
  const negativeSnippets = negativeThemes.map(([label]) => label).join(", ");

  const summaryParts: string[] = [];
  summaryParts.push(
    `Based on ${reviewCount} review${reviewCount === 1 ? "" : "s"}, ${meal.title} has an average rating of ${averageRating.toFixed(1)}/5.`,
  );
  if (positiveSnippets) {
    summaryParts.push(`Most customers highlight ${positiveSnippets}.`);
  } else {
    summaryParts.push(
      "Most customers leave positive ratings, but detailed comments are limited.",
    );
  }
  if (negativeSnippets) {
    summaryParts.push(`A few reviews mention ${negativeSnippets}.`);
  }

  const themes = [
    ...positiveThemes.map(([label, mentions]) => ({
      label,
      mentions,
      sentiment: "positive" as const,
    })),
    ...negativeThemes.map(([label, mentions]) => ({
      label,
      mentions,
      sentiment: "negative" as const,
    })),
  ];

  let recommendation = "This meal has a balanced review profile.";
  if (averageRating >= 4.3 && negativeCount <= 1) {
    recommendation = "Strong overall reviews make this a safe pick.";
  } else if (averageRating >= 3.8) {
    recommendation =
      "Generally well liked, with a few trade-offs mentioned in comments.";
  } else if (averageRating < 3.5) {
    recommendation =
      "Reviews are mixed, so check the concerns before ordering.";
  }

  return {
    mealId: meal.id,
    mealTitle: meal.title,
    reviewCount,
    averageRating: Number(averageRating.toFixed(1)),
    positiveCount,
    neutralCount,
    negativeCount,
    summary: summaryParts.join(" "),
    highlights,
    concerns,
    themes,
    recommendation,
  };
};

export const AiService = {
  async recommendMeals(params: RecommendMealsParams) {
    const limit = clampLimit(params.limit);
    const excludeIds = new Set((params.excludeIds ?? []).filter(Boolean));
    if (params.mealId) {
      excludeIds.add(params.mealId);
    }

    const [seedMeal, meals, recentOrders, reviews] = await Promise.all([
      params.mealId
        ? prisma.meal.findUnique({
            where: { id: params.mealId },
            include: { category: true, provider: true, reviews: true },
          })
        : Promise.resolve(null),
      prisma.meal.findMany({
        where: {
          isAvailable: true,
          ...(excludeIds.size > 0
            ? { id: { notIn: Array.from(excludeIds) } }
            : {}),
        },
        include: {
          category: true,
          provider: true,
          reviews: true,
        },
        take: 80,
        orderBy: { createdAt: "desc" },
      }),
      params.userId
        ? prisma.order.findMany({
            where: {
              customerId: params.userId,
              status: "DELIVERED",
            },
            include: {
              items: {
                include: {
                  meal: {
                    include: {
                      category: true,
                      provider: true,
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 12,
          })
        : Promise.resolve([]),
      params.userId
        ? prisma.review.findMany({
            where: { customerId: params.userId },
            include: {
              meal: {
                include: {
                  category: true,
                  provider: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 20,
          })
        : Promise.resolve([]),
    ]);

    const preferredCategories = new Map<string, number>();
    const preferredProviders = new Map<string, number>();
    const observedPrices: number[] = [];
    const likedMealCategories = new Map<string, number>();
    const likedDietaryTags = new Map<string, number>();

    for (const order of recentOrders) {
      for (const item of order.items) {
        preferredCategories.set(
          item.meal.categoryId,
          (preferredCategories.get(item.meal.categoryId) ?? 0) + item.quantity,
        );
        preferredProviders.set(
          item.meal.providerId,
          (preferredProviders.get(item.meal.providerId) ?? 0) + item.quantity,
        );
        observedPrices.push(decimalToNumber(item.unitPrice));
        for (const tag of item.meal.dietary ?? []) {
          likedDietaryTags.set(tag, (likedDietaryTags.get(tag) ?? 0) + 1);
        }
      }
    }

    for (const review of reviews) {
      if (review.rating >= 4) {
        likedMealCategories.set(
          review.meal.categoryId,
          (likedMealCategories.get(review.meal.categoryId) ?? 0) + 1,
        );
        preferredProviders.set(
          review.meal.providerId,
          (preferredProviders.get(review.meal.providerId) ?? 0) + 1,
        );
        for (const tag of review.meal.dietary ?? []) {
          likedDietaryTags.set(tag, (likedDietaryTags.get(tag) ?? 0) + 1);
        }
      }
    }

    const targetPrice = average(observedPrices);
    const seedDietary = seedMeal?.dietary ?? [];

    return meals
      .map<ScoredRecommendation>((meal) => {
        let score = 0;
        let signal: RecommendationSignal = "popular_pick";
        let reason = "Trending with strong ratings from recent customers.";

        const ratingAverage = average(
          meal.reviews.map((review) => review.rating),
        );
        const reviewCount = meal.reviews.length;
        score += ratingAverage * 1.8 + Math.min(reviewCount, 12) * 0.3;

        const historyCategoryBoost =
          (preferredCategories.get(meal.categoryId) ?? 0) * 1.2 +
          (likedMealCategories.get(meal.categoryId) ?? 0) * 1.4;
        if (historyCategoryBoost > 0) {
          score += historyCategoryBoost;
          signal = "personal_history";
          reason =
            "Matches categories you order and rate positively most often.";
        }

        const historyProviderBoost =
          (preferredProviders.get(meal.providerId) ?? 0) * 0.9;
        if (historyProviderBoost > 0) {
          score += historyProviderBoost;
          signal = "personal_history";
          reason =
            "Comes from a provider you already trust in previous orders.";
        }

        const dietaryAffinity = meal.dietary.reduce(
          (sum, tag) => sum + (likedDietaryTags.get(tag) ?? 0),
          0,
        );
        if (dietaryAffinity > 0) {
          score += Math.min(dietaryAffinity * 0.8, 2.4);
          signal = "personal_history";
          reason = "Fits the meal styles and dietary tags you keep choosing.";
        }

        if (seedMeal) {
          if (meal.categoryId === seedMeal.categoryId) {
            score += 3.2;
            signal = "similar_meal";
            reason = `Similar to ${seedMeal.title} because it shares the same category.`;
          }

          if (meal.providerId === seedMeal.providerId) {
            score += 1.8;
            signal = "similar_meal";
            reason = `Another strong option from the same provider as ${seedMeal.title}.`;
          }

          const dietaryOverlap = overlapCount(meal.dietary, seedDietary);
          if (dietaryOverlap > 0) {
            score += Math.min(dietaryOverlap * 1.1, 2.2);
            signal = "similar_meal";
            reason = `Shares similar dietary traits with ${seedMeal.title}.`;
          }
        }

        const mealPrice = decimalToNumber(meal.price);
        if (targetPrice > 0) {
          const priceDistance = Math.abs(mealPrice - targetPrice) / targetPrice;
          if (priceDistance <= 0.25) {
            score += 1.6;
            if (signal === "popular_pick") {
              signal = "budget_match";
              reason =
                "Fits the price range you usually spend on delivered meals.";
            }
          } else if (priceDistance <= 0.45) {
            score += 0.8;
          }
        }

        return { meal, score, signal, reason };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ meal, score, signal, reason }) => ({
        id: meal.id,
        title: meal.title,
        description: meal.description,
        dietary: meal.dietary,
        imageUrl: meal.imageUrl,
        price: decimalToNumber(meal.price),
        rating: Number(
          average(meal.reviews.map((review) => review.rating)).toFixed(1),
        ),
        reviewCount: meal.reviews.length,
        score: Number(score.toFixed(2)),
        signal,
        reason,
        provider: {
          id: meal.provider.id,
          name: meal.provider.name,
        },
        category: {
          id: meal.category.id,
          name: meal.category.name,
          slug: meal.category.slug,
        },
      }));
  },

  async searchMealsByNaturalLanguage(params: MealSearchParams) {
    const limit = clampLimit(params.limit);
    const parsedQuery = parseMealSearchQuery(params.query);
    const llmParsed = await parseMealSearchQueryWithLlm(params.query);
    const mergedParsedQuery: ParsedMealSearchQuery = llmParsed
      ? {
          normalizedQuery: parsedQuery.normalizedQuery,
          terms: Array.from(
            new Set([...parsedQuery.terms, ...llmParsed.terms]),
          ),
          minPrice: llmParsed.minPrice ?? parsedQuery.minPrice,
          maxPrice: llmParsed.maxPrice ?? parsedQuery.maxPrice,
          intents: {
            budget: parsedQuery.intents.budget || llmParsed.intents.budget,
            premium: parsedQuery.intents.premium || llmParsed.intents.premium,
            healthy: parsedQuery.intents.healthy || llmParsed.intents.healthy,
            spicy: parsedQuery.intents.spicy || llmParsed.intents.spicy,
            sweet: parsedQuery.intents.sweet || llmParsed.intents.sweet,
            proteinRich:
              parsedQuery.intents.proteinRich || llmParsed.intents.proteinRich,
          },
        }
      : parsedQuery;

    if (!mergedParsedQuery.normalizedQuery) {
      return {
        query: params.query,
        interpreted: {
          terms: [],
          minPrice: null,
          maxPrice: null,
          intents: mergedParsedQuery.intents,
        },
        data: [],
      };
    }

    const where: Prisma.MealWhereInput = { isAvailable: true };

    if (
      mergedParsedQuery.minPrice !== null ||
      mergedParsedQuery.maxPrice !== null
    ) {
      where.price = {};
      if (mergedParsedQuery.minPrice !== null) {
        where.price.gte = new Prisma.Decimal(mergedParsedQuery.minPrice);
      }
      if (mergedParsedQuery.maxPrice !== null) {
        where.price.lte = new Prisma.Decimal(mergedParsedQuery.maxPrice);
      }
    }

    if (mergedParsedQuery.terms.length > 0) {
      where.OR = mergedParsedQuery.terms.flatMap((term) => [
        { title: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
        { dietary: { has: term } },
        { category: { name: { contains: term, mode: "insensitive" } } },
        { provider: { name: { contains: term, mode: "insensitive" } } },
      ]);
    }

    const [initialCandidateMeals, recentOrders, reviews] = await Promise.all([
      prisma.meal.findMany({
        where,
        include: {
          category: true,
          provider: true,
          reviews: true,
        },
        take: 120,
        orderBy: [{ createdAt: "desc" }],
      }),
      params.userId
        ? prisma.order.findMany({
            where: {
              customerId: params.userId,
              status: "DELIVERED",
            },
            include: {
              items: {
                include: {
                  meal: {
                    select: {
                      categoryId: true,
                      providerId: true,
                      dietary: true,
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 12,
          })
        : Promise.resolve([]),
      params.userId
        ? prisma.review.findMany({
            where: { customerId: params.userId },
            include: {
              meal: {
                select: {
                  categoryId: true,
                  providerId: true,
                  dietary: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 20,
          })
        : Promise.resolve([]),
    ]);

    let candidateMeals = initialCandidateMeals;
    if (candidateMeals.length === 0) {
      const relaxedWhere: Prisma.MealWhereInput = { isAvailable: true };
      if (mergedParsedQuery.terms.length > 0) {
        relaxedWhere.OR = mergedParsedQuery.terms.flatMap((term) => [
          { title: { contains: term, mode: "insensitive" } },
          { description: { contains: term, mode: "insensitive" } },
          { dietary: { has: term } },
          { category: { name: { contains: term, mode: "insensitive" } } },
          { provider: { name: { contains: term, mode: "insensitive" } } },
        ]);
      }

      candidateMeals = await prisma.meal.findMany({
        where: relaxedWhere,
        include: {
          category: true,
          provider: true,
          reviews: true,
        },
        take: 120,
        orderBy: [{ createdAt: "desc" }],
      });
    }

    if (candidateMeals.length === 0) {
      candidateMeals = await prisma.meal.findMany({
        where: { isAvailable: true },
        include: {
          category: true,
          provider: true,
          reviews: true,
        },
        take: 120,
        orderBy: [{ createdAt: "desc" }],
      });
    }

    const preferredCategories = new Map<string, number>();
    const preferredProviders = new Map<string, number>();
    const preferredDietary = new Map<string, number>();

    for (const order of recentOrders) {
      for (const item of order.items) {
        preferredCategories.set(
          item.meal.categoryId,
          (preferredCategories.get(item.meal.categoryId) ?? 0) + item.quantity,
        );
        preferredProviders.set(
          item.meal.providerId,
          (preferredProviders.get(item.meal.providerId) ?? 0) + item.quantity,
        );
        for (const tag of item.meal.dietary ?? []) {
          preferredDietary.set(
            tag.toLowerCase(),
            (preferredDietary.get(tag.toLowerCase()) ?? 0) + 1,
          );
        }
      }
    }

    for (const review of reviews) {
      if (review.rating < 4) continue;
      preferredCategories.set(
        review.meal.categoryId,
        (preferredCategories.get(review.meal.categoryId) ?? 0) + 1,
      );
      preferredProviders.set(
        review.meal.providerId,
        (preferredProviders.get(review.meal.providerId) ?? 0) + 1,
      );
      for (const tag of review.meal.dietary ?? []) {
        preferredDietary.set(
          tag.toLowerCase(),
          (preferredDietary.get(tag.toLowerCase()) ?? 0) + 1,
        );
      }
    }

    const scored = candidateMeals
      .map((meal) => {
        const normalizedTitle = normalizeText(meal.title);
        const normalizedDescription = normalizeText(meal.description ?? "");
        const normalizedCategory = normalizeText(meal.category.name);
        const normalizedProvider = normalizeText(meal.provider.name);
        const mealDietary = (meal.dietary ?? []).map((item) =>
          item.toLowerCase(),
        );

        let score = 0;
        let signal: SearchResultSignal = "text_match";
        let reason = "Matches your search language with relevant meal details.";
        const matchTerms: string[] = [];

        if (textIncludes(normalizedTitle, mergedParsedQuery.normalizedQuery)) {
          score += 6;
          reason = "Title is very close to your full search query.";
        }

        if (
          normalizedDescription.length > 0 &&
          textIncludes(normalizedDescription, mergedParsedQuery.normalizedQuery)
        ) {
          score += 4.2;
          reason = "Description closely matches what you asked for.";
        }

        for (const term of mergedParsedQuery.terms) {
          if (textIncludes(normalizedTitle, term)) {
            score += 2.3;
            matchTerms.push(term);
          }
          if (
            normalizedDescription.length > 0 &&
            textIncludes(normalizedDescription, term)
          ) {
            score += 1.2;
            matchTerms.push(term);
          }
          if (textIncludes(normalizedCategory, term)) {
            score += 1.8;
            matchTerms.push(term);
          }
          if (textIncludes(normalizedProvider, term)) {
            score += 1.4;
            matchTerms.push(term);
          }
          if (mealDietary.some((dietTag) => dietTag.includes(term))) {
            score += 2;
            matchTerms.push(term);
          }
        }

        if (
          mergedParsedQuery.intents.healthy &&
          mealDietary.some((tag) => /healthy|fresh|light|low/.test(tag))
        ) {
          score += 2.4;
        }
        if (
          mergedParsedQuery.intents.spicy &&
          mealDietary.some((tag) => /spicy|hot|chili|chilli/.test(tag))
        ) {
          score += 2.2;
        }
        if (
          mergedParsedQuery.intents.sweet &&
          mealDietary.some((tag) => /sweet|dessert/.test(tag))
        ) {
          score += 2;
        }
        if (
          mergedParsedQuery.intents.proteinRich &&
          mealDietary.some((tag) => /protein|high-protein|fit/.test(tag))
        ) {
          score += 2.2;
        }

        const mealPrice = decimalToNumber(meal.price);
        if (mergedParsedQuery.intents.budget) {
          score += Math.max(0, 2.8 - mealPrice / 30);
          signal = "budget_match";
          reason = "Better aligned with a budget-friendly search intent.";
        }
        if (mergedParsedQuery.intents.premium) {
          score += Math.min(3, mealPrice / 30);
          signal = "premium_match";
          reason = "Price profile aligns with a premium search intent.";
        }

        const ratingAverage = average(
          meal.reviews.map((review) => review.rating),
        );
        score += ratingAverage * 1.2 + Math.min(meal.reviews.length, 15) * 0.25;

        const categoryBoost = preferredCategories.get(meal.categoryId) ?? 0;
        const providerBoost = preferredProviders.get(meal.providerId) ?? 0;
        const dietaryBoost = mealDietary.reduce(
          (sum, tag) => sum + (preferredDietary.get(tag.toLowerCase()) ?? 0),
          0,
        );

        const personalizedBoost =
          categoryBoost * 0.8 + providerBoost * 0.7 + dietaryBoost * 0.5;
        if (personalizedBoost > 0) {
          score += personalizedBoost;
          signal = "personalized_match";
          reason = "Also aligned with your ordering and review preferences.";
        }

        return {
          meal,
          signal,
          reason,
          score,
          matchTerms: Array.from(new Set(matchTerms)),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ meal, signal, reason, score, matchTerms }) => ({
        id: meal.id,
        title: meal.title,
        description: meal.description,
        dietary: meal.dietary,
        imageUrl: meal.imageUrl,
        price: decimalToNumber(meal.price),
        rating: Number(
          average(meal.reviews.map((review) => review.rating)).toFixed(1),
        ),
        reviewCount: meal.reviews.length,
        score: Number(score.toFixed(2)),
        signal,
        reason,
        matchTerms,
        provider: {
          id: meal.provider.id,
          name: meal.provider.name,
        },
        category: {
          id: meal.category.id,
          name: meal.category.name,
          slug: meal.category.slug,
        },
      }));

    return {
      query: params.query,
      interpreted: {
        terms: mergedParsedQuery.terms,
        minPrice: mergedParsedQuery.minPrice,
        maxPrice: mergedParsedQuery.maxPrice,
        intents: mergedParsedQuery.intents,
      },
      data: scored,
    };
  },

  async summarizeMealReviews(params: MealReviewSummaryParams) {
    const meal = await prisma.meal.findUnique({
      where: { id: params.mealId },
      include: {
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
      return null;
    }

    const summary = summarizeMealReviews({
      id: meal.id,
      title: meal.title,
      reviews: meal.reviews.map((review) => ({
        rating: review.rating,
        comment: review.comment,
      })),
    });

    const llmSummary = await LlmService.json<LlmReviewSummaryRewrite>({
      systemPrompt:
        "You summarize meal reviews for a food app. Use only supplied data and never invent facts. Return JSON only with keys: summary (string), highlights (string[] up to 3), concerns (string[] up to 3), recommendation (string). Keep summary <= 90 words.",
      userPrompt: JSON.stringify({
        mealTitle: meal.title,
        reviewCount: summary.reviewCount,
        averageRating: summary.averageRating,
        positiveCount: summary.positiveCount,
        neutralCount: summary.neutralCount,
        negativeCount: summary.negativeCount,
        themes: summary.themes,
        recentComments: meal.reviews
          .map((review) => review.comment)
          .filter((comment): comment is string => Boolean(comment))
          .slice(0, 8),
      }),
      maxTokens: 420,
      temperature: 0.1,
      cacheTtlMs: 15 * 60 * 1000,
    });

    const validatedSummary = llmSummary
      ? llmReviewSummarySchema.safeParse(llmSummary)
      : null;
    const stableSummary = validatedSummary?.success
      ? validatedSummary.data
      : null;

    const mergedSummary = {
      ...summary,
      ...(stableSummary?.summary ? { summary: stableSummary.summary } : {}),
      ...(Array.isArray(stableSummary?.highlights) &&
      stableSummary.highlights.length > 0
        ? { highlights: stableSummary.highlights.slice(0, 3) }
        : {}),
      ...(Array.isArray(stableSummary?.concerns) &&
      stableSummary.concerns.length > 0
        ? { concerns: stableSummary.concerns.slice(0, 3) }
        : {}),
      ...(stableSummary?.recommendation
        ? { recommendation: stableSummary.recommendation }
        : {}),
    };

    return {
      ...mergedSummary,
      meal: {
        id: meal.id,
        title: meal.title,
      },
      reviews: meal.reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        customer: review.customer,
      })),
    };
  },

  async supportChat(params: SupportChatParams) {
    const message = params.message.trim();
    if (!message) {
      return {
        reply: "Please share your question so I can help you.",
        intent: "unknown",
        suggestions: ["How to login?", "How to track my order?"],
        escalate: false,
        source: "rules",
      } as const;
    }

    const lower = normalizeText(message);
    const fallback = () => {
      if (/login|sign in|password|account/.test(lower)) {
        return {
          reply:
            "For login issues, check your email/password first. If you still cannot sign in, try resetting your session and logging in again.",
          intent: "auth_help",
          suggestions: [
            "I forgot my password",
            "My session keeps expiring",
            "Login works on API but not browser",
          ],
          escalate: false,
          source: "rules",
        } as const;
      }

      if (/payment|stripe|checkout|card/.test(lower)) {
        return {
          reply:
            "For payment issues, retry checkout once, then confirm your payment status from orders. If charged but no order appears, contact support with your session ID.",
          intent: "payment_help",
          suggestions: [
            "Checkout failed",
            "Payment succeeded but no order",
            "How to retry payment",
          ],
          escalate: true,
          source: "rules",
        } as const;
      }

      if (/order|delivery|track|status/.test(lower)) {
        return {
          reply:
            "You can track order progress from the Orders page. Status moves from PENDING to CONFIRMED, PREPARING, OUT_FOR_DELIVERY, and DELIVERED.",
          intent: "order_help",
          suggestions: [
            "Where is my order?",
            "How long does delivery take?",
            "Can I cancel my order?",
          ],
          escalate: false,
          source: "rules",
        } as const;
      }

      return {
        reply:
          "I can help with login, payments, orders, provider onboarding, and account questions. Tell me which issue you are facing.",
        intent: "general_help",
        suggestions: [
          "Help with login",
          "Help with checkout",
          "How to become a provider",
        ],
        escalate: false,
        source: "rules",
      } as const;
    };

    const llm = await LlmService.json<LlmSupportChat>({
      systemPrompt:
        "You are FoodHub support assistant. Only answer about login, account, meals, cart, orders, payments, provider onboarding, and reviews. Keep reply short (max 80 words). Return JSON only: reply, intent, suggestions (<=3), escalate (boolean). If unclear, ask a short clarifying question.",
      userPrompt: JSON.stringify({
        message,
        userId: params.userId ?? null,
      }),
      maxTokens: 320,
      temperature: 0.1,
      cacheTtlMs: 2 * 60 * 1000,
    });

    const validatedChat = llm ? llmSupportSchema.safeParse(llm) : null;
    const stableChat = validatedChat?.success ? validatedChat.data : null;

    if (!stableChat?.reply) {
      return fallback();
    }

    return {
      reply: stableChat.reply,
      intent: stableChat.intent || "general_help",
      suggestions: Array.isArray(stableChat.suggestions)
        ? stableChat.suggestions
            .filter((item): item is string => typeof item === "string")
            .slice(0, 3)
        : [],
      escalate: stableChat.escalate === true,
      source: "llm",
    } as const;
  },
};
