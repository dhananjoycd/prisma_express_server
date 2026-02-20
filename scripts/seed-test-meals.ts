import "dotenv/config";
import { prisma } from "../src/lib/prisma";

type SeedCategory = {
  name: string;
  slug: string;
  description?: string;
};

type ProviderMealSeed = {
  providerEmail: string;
  providerName: string;
  cuisine: string;
  meals: Array<{
    title: string;
    description: string;
    categorySlug: string;
    dietary: string[];
    price: number;
    imageUrl?: string;
    isAvailable?: boolean;
  }>;
};

const categories: SeedCategory[] = [
  { name: "Biryani", slug: "biryani", description: "Traditional and modern biryani dishes" },
  { name: "Bengali", slug: "bengali", description: "Classic Bangladeshi meals and sides" },
  { name: "Fast Food", slug: "fast-food", description: "Burgers, wraps and fried snacks" },
  { name: "BBQ", slug: "bbq", description: "Grilled and smoky specialties" },
  { name: "Indian", slug: "indian", description: "Spicy curries and rice combinations" },
];

const providerMeals: ProviderMealSeed[] = [
  {
    providerEmail: "dhakabiryani@foodhub.com",
    providerName: "Dhaka Biryani House",
    cuisine: "Biryani",
    meals: [
      {
        title: "Kacchi Biryani (Full)",
        description: "Fragrant basmati rice with tender mutton, potato and special spices.",
        categorySlug: "biryani",
        dietary: ["Halal", "High-Protein"],
        price: 450,
      },
      {
        title: "Chicken Tehari",
        description: "Spiced rice with chicken and green chili flavor.",
        categorySlug: "bengali",
        dietary: ["Halal", "Spicy"],
        price: 280,
      },
      {
        title: "Jali Kebab Platter",
        description: "Smoky kebab platter served with chutney and salad.",
        categorySlug: "bbq",
        dietary: ["Halal", "Keto-Friendly"],
        price: 320,
      },
    ],
  },
  {
    providerEmail: "rajshahifood@foodhub.com",
    providerName: "Rajshahi Food Corner",
    cuisine: "Bengali",
    meals: [
      {
        title: "Beef Kala Bhuna with Polao",
        description: "Slow-cooked spicy beef served with aromatic polao.",
        categorySlug: "bengali",
        dietary: ["Halal", "Spicy"],
        price: 360,
      },
      {
        title: "Morog Polao",
        description: "Traditional chicken polao with mildly sweet flavor.",
        categorySlug: "bengali",
        dietary: ["Halal"],
        price: 300,
      },
      {
        title: "Special Mutton Tehari",
        description: "Rajshahi style tehari with rich spices and mutton.",
        categorySlug: "biryani",
        dietary: ["Halal", "High-Protein"],
        price: 390,
      },
    ],
  },
  {
    providerEmail: "chillox@foodhub.com",
    providerName: "Chillox Express",
    cuisine: "Fast Food",
    meals: [
      {
        title: "Smash Beef Burger",
        description: "Double patty smash burger with cheese and signature sauce.",
        categorySlug: "fast-food",
        dietary: ["Halal", "High-Protein"],
        price: 290,
      },
      {
        title: "Chicken Loaded Fries",
        description: "Crispy fries topped with spicy chicken and cheese drizzle.",
        categorySlug: "fast-food",
        dietary: ["Halal"],
        price: 240,
      },
      {
        title: "BBQ Chicken Wrap",
        description: "Grilled chicken wrap with smoky BBQ sauce.",
        categorySlug: "bbq",
        dietary: ["Halal", "High-Protein"],
        price: 220,
      },
    ],
  },
  {
    providerEmail: "spiceandrice@foodhub.com",
    providerName: "Spice & Rice",
    cuisine: "Indian",
    meals: [
      {
        title: "Butter Chicken with Naan",
        description: "Creamy tomato-based butter chicken served with naan.",
        categorySlug: "indian",
        dietary: ["Halal"],
        price: 340,
      },
      {
        title: "Paneer Tikka Masala",
        description: "Charred paneer cubes in rich tikka masala gravy.",
        categorySlug: "indian",
        dietary: ["Vegetarian", "Gluten-Free"],
        price: 310,
      },
      {
        title: "Hyderabadi Chicken Biryani",
        description: "Layered biryani with saffron and tender chicken.",
        categorySlug: "biryani",
        dietary: ["Halal", "Spicy"],
        price: 370,
      },
    ],
  },
];

const seed = async () => {
  const categoryBySlug = new Map<string, string>();

  for (const category of categories) {
    const saved = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
      },
      create: {
        name: category.name,
        slug: category.slug,
        description: category.description,
      },
      select: { id: true, slug: true },
    });
    categoryBySlug.set(saved.slug, saved.id);
  }

  let created = 0;
  let updated = 0;

  for (const providerSeed of providerMeals) {
    const provider = await prisma.user.findUnique({
      where: { email: providerSeed.providerEmail },
      select: { id: true, role: true },
    });

    if (!provider) {
      throw new Error(`Provider not found: ${providerSeed.providerEmail}`);
    }

    await prisma.providerProfile.upsert({
      where: { userId: provider.id },
      update: {
        restaurantName: providerSeed.providerName,
        cuisine: providerSeed.cuisine,
      },
      create: {
        userId: provider.id,
        restaurantName: providerSeed.providerName,
        cuisine: providerSeed.cuisine,
      },
    });

    for (const meal of providerSeed.meals) {
      const categoryId = categoryBySlug.get(meal.categorySlug);
      if (!categoryId) {
        throw new Error(`Category missing for slug: ${meal.categorySlug}`);
      }

      const existing = await prisma.meal.findFirst({
        where: {
          providerId: provider.id,
          title: meal.title,
        },
        select: { id: true },
      });

      if (existing) {
        await prisma.meal.update({
          where: { id: existing.id },
          data: {
            categoryId,
            description: meal.description,
            dietary: meal.dietary,
            price: meal.price,
            imageUrl: meal.imageUrl,
            isAvailable: meal.isAvailable ?? true,
          },
        });
        updated += 1;
      } else {
        await prisma.meal.create({
          data: {
            providerId: provider.id,
            categoryId,
            title: meal.title,
            description: meal.description,
            dietary: meal.dietary,
            price: meal.price,
            imageUrl: meal.imageUrl,
            isAvailable: meal.isAvailable ?? true,
          },
        });
        created += 1;
      }
    }
  }

  console.log(`Meal seed complete. Created: ${created}, Updated: ${updated}`);
};

seed()
  .catch((error) => {
    console.error("Meal seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
