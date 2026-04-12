import "dotenv/config";
import { OrderStatus, PaymentStatus, UserRole } from "../generated/prisma/enums";
import { Prisma } from "../generated/prisma/client";
import { getAuth } from "../src/lib/better-auth";
import { prisma } from "../src/lib/prisma";

type SeedUser = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
};

type SeedCategory = {
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
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

type SeedCart = {
  customerEmail: string;
  items: Array<{
    providerEmail: string;
    mealTitle: string;
    quantity: number;
  }>;
};

type SeedOrder = {
  code: string;
  customerEmail: string;
  deliveryAddress: string;
  status: OrderStatus;
  paymentStatus?: PaymentStatus;
  paymentReference?: string;
  scheduleType?: "NOW" | "LATER";
  scheduledAt?: Date;
  items: Array<{
    providerEmail: string;
    mealTitle: string;
    quantity: number;
  }>;
};

type SeedReview = {
  customerEmail: string;
  providerEmail: string;
  mealTitle: string;
  rating: number;
  comment?: string;
};

const normalizeSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const hashString = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const fallbackUnsplashPhotos = [
  "photo-1512621776951-a57141f2eefd",
  "photo-1600891964599-f61ba0e24092",
  "photo-1540189549336-e6e99c3679fe",
  "photo-1504674900247-0877df9cc836",
  "photo-1498837167922-ddd27525d352",
  "photo-1482049016688-2d3e1b311543",
  "photo-1555939594-58d7cb561ad1",
  "photo-1559847844-5315695dadae",
  "photo-1550547660-d9450f859349",
  "photo-1565299624946-b28f40a0ae38",
  "photo-1506354666786-959d6d497f1a",
  "photo-1467003909585-2f8a72700288",
];

const buildFoodImage = (type: "category" | "meal", key: string) =>
  `https://images.unsplash.com/${
    fallbackUnsplashPhotos[
      hashString(`${type}-${normalizeSlug(key)}`) %
        fallbackUnsplashPhotos.length
    ]
  }?auto=format&fit=crop&w=1400&q=80`;

const seedUsers: SeedUser[] = [
  {
    name: "Dhaka Biryani House",
    email: "dhakabiryani@foodhub.com",
    password: "Test@1234",
    role: UserRole.PROVIDER,
  },
  {
    name: "Rajshahi Food Corner",
    email: "rajshahifood@foodhub.com",
    password: "Test@1234",
    role: UserRole.PROVIDER,
  },
  {
    name: "Chillox Express",
    email: "chillox@foodhub.com",
    password: "Test@1234",
    role: UserRole.PROVIDER,
  },
  {
    name: "Spice & Rice",
    email: "spiceandrice@foodhub.com",
    password: "Test@1234",
    role: UserRole.PROVIDER,
  },
  {
    name: "Sultan Grill House",
    email: "sultangrill@foodhub.com",
    password: "Test@1234",
    role: UserRole.PROVIDER,
  },
  {
    name: "Ocean Catch Kitchen",
    email: "oceancatch@foodhub.com",
    password: "Test@1234",
    role: UserRole.PROVIDER,
  },
  {
    name: "Green Bowl Cafe",
    email: "greenbowl@foodhub.com",
    password: "Test@1234",
    role: UserRole.PROVIDER,
  },
  {
    name: "Street Taco Lab",
    email: "streettaco@foodhub.com",
    password: "Test@1234",
    role: UserRole.PROVIDER,
  },
  {
    name: "Pasta Point",
    email: "pastapoint@foodhub.com",
    password: "Test@1234",
    role: UserRole.PROVIDER,
  },
  {
    name: "Wok & Flame",
    email: "wokflame@foodhub.com",
    password: "Test@1234",
    role: UserRole.PROVIDER,
  },
  {
    name: "Nawabi Handi",
    email: "nawabihandi@foodhub.com",
    password: "Test@1234",
    role: UserRole.PROVIDER,
  },
  {
    name: "Fit Meal Box",
    email: "fitmealbox@foodhub.com",
    password: "Test@1234",
    role: UserRole.PROVIDER,
  },
  {
    name: "Morning Bite Bakery",
    email: "morningbite@foodhub.com",
    password: "Test@1234",
    role: UserRole.PROVIDER,
  },
  {
    name: "Deshi Dessert Studio",
    email: "deshidessert@foodhub.com",
    password: "Test@1234",
    role: UserRole.PROVIDER,
  },
  {
    name: "Wrap Station",
    email: "wrapstation@foodhub.com",
    password: "Test@1234",
    role: UserRole.PROVIDER,
  },
  {
    name: "Rahim Uddin",
    email: "rahim.uddin@gmail.com",
    password: "Test@1234",
    role: UserRole.CUSTOMER,
  },
  {
    name: "Nusrat Jahan",
    email: "nusrat.jahan@gmail.com",
    password: "Test@1234",
    role: UserRole.CUSTOMER,
  },
  {
    name: "Tanvir Hasan",
    email: "tanvir.hasan@gmail.com",
    password: "Test@1234",
    role: UserRole.CUSTOMER,
  },
  {
    name: "Sadia Akter",
    email: "sadia.akter@gmail.com",
    password: "Test@1234",
    role: UserRole.CUSTOMER,
  },
  {
    name: "Mahmudul Karim",
    email: "mahmudul.karim@gmail.com",
    password: "Test@1234",
    role: UserRole.CUSTOMER,
  },
  {
    name: "Farzana Rahman",
    email: "farzana.rahman@gmail.com",
    password: "Test@1234",
    role: UserRole.CUSTOMER,
  },
  {
    name: "FoodHub Platform Admin",
    email: "admin@foodhub.com",
    password: "Test@1234",
    role: UserRole.ADMIN,
  },
  {
    name: "Operations Manager",
    email: "ops@foodhub.com",
    password: "Test@1234",
    role: UserRole.ADMIN,
  },
];

const categories: SeedCategory[] = [
  {
    name: "Biryani",
    slug: "biryani",
    description: "Traditional and modern biryani dishes",
    imageUrl: "https://picsum.photos/seed/foodhub-biryani/1200/800",
  },
  {
    name: "Bengali",
    slug: "bengali",
    description: "Classic Bangladeshi meals and sides",
    imageUrl: "https://picsum.photos/seed/foodhub-bengali/1200/800",
  },
  {
    name: "Fast Food",
    slug: "fast-food",
    description: "Burgers, wraps and fried snacks",
    imageUrl: "https://picsum.photos/seed/foodhub-fast-food/1200/800",
  },
  {
    name: "BBQ",
    slug: "bbq",
    description: "Grilled and smoky specialties",
    imageUrl: "https://picsum.photos/seed/foodhub-bbq/1200/800",
  },
  {
    name: "Indian",
    slug: "indian",
    description: "Spicy curries and rice combinations",
    imageUrl: "https://picsum.photos/seed/foodhub-indian/1200/800",
  },
  {
    name: "Seafood",
    slug: "seafood",
    description: "Fish, prawn and coastal special dishes",
    imageUrl: "https://picsum.photos/seed/foodhub-seafood/1200/800",
  },
  {
    name: "Healthy",
    slug: "healthy",
    description: "Balanced meals with fresh ingredients",
    imageUrl: "https://picsum.photos/seed/foodhub-healthy/1200/800",
  },
  {
    name: "Thai",
    slug: "thai",
    description: "Thai curries, noodles and stir-fry",
    imageUrl: "https://picsum.photos/seed/foodhub-thai/1200/800",
  },
  {
    name: "Chinese",
    slug: "chinese",
    description: "Classic Chinese mains and rice bowls",
    imageUrl: "https://picsum.photos/seed/foodhub-chinese/1200/800",
  },
  {
    name: "Italian",
    slug: "italian",
    description: "Pasta, risotto and Italian comfort food",
    imageUrl: "https://picsum.photos/seed/foodhub-italian/1200/800",
  },
  {
    name: "Dessert",
    slug: "dessert",
    description: "Cakes, sweets and signature desserts",
    imageUrl: "https://picsum.photos/seed/foodhub-dessert/1200/800",
  },
  {
    name: "Breakfast",
    slug: "breakfast",
    description: "Morning platters and baked items",
    imageUrl: "https://picsum.photos/seed/foodhub-breakfast/1200/800",
  },
  {
    name: "Mexican",
    slug: "mexican",
    description: "Tacos, burritos and Mexican street flavors",
    imageUrl: "https://picsum.photos/seed/foodhub-mexican/1200/800",
  },
  {
    name: "Wraps",
    slug: "wraps",
    description: "Rolls and wraps for quick meals",
    imageUrl: "https://picsum.photos/seed/foodhub-wraps/1200/800",
  },
  {
    name: "Steak",
    slug: "steak",
    description: "Grilled steak and premium meat dishes",
    imageUrl: "https://picsum.photos/seed/foodhub-steak/1200/800",
  },
  {
    name: "Pizza",
    slug: "pizza",
    description: "Wood-fired and cheesy pizza selections",
    imageUrl: "https://picsum.photos/seed/foodhub-pizza/1200/800",
  },
];

const providerMeals: ProviderMealSeed[] = [
  {
    providerEmail: "dhakabiryani@foodhub.com",
    providerName: "Dhaka Biryani House",
    cuisine: "Biryani",
    meals: [
      {
        title: "Kacchi Biryani (Full)",
        description:
          "Fragrant basmati rice with tender mutton, potato and special spices.",
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
      {
        title: "Mutton Rezala",
        description: "Creamy Bengali-style mutton curry with aromatic spices.",
        categorySlug: "bengali",
        dietary: ["Halal"],
        price: 410,
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
      {
        title: "Shorshe Ilish",
        description: "Hilsa fish in mustard gravy, served with steamed rice.",
        categorySlug: "seafood",
        dietary: ["Halal"],
        price: 520,
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
        description:
          "Double patty smash burger with cheese and signature sauce.",
        categorySlug: "fast-food",
        dietary: ["Halal", "High-Protein"],
        price: 290,
      },
      {
        title: "Chicken Loaded Fries",
        description:
          "Crispy fries topped with spicy chicken and cheese drizzle.",
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
      {
        title: "Zinger Tower Burger",
        description: "Crispy chicken fillet burger with spicy mayo and slaw.",
        categorySlug: "fast-food",
        dietary: ["Halal", "Spicy"],
        price: 310,
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
      {
        title: "Garlic Butter Naan Basket",
        description: "Assorted naan basket with garlic butter and herbs.",
        categorySlug: "indian",
        dietary: ["Vegetarian"],
        price: 190,
      },
    ],
  },
  {
    providerEmail: "sultangrill@foodhub.com",
    providerName: "Sultan Grill House",
    cuisine: "Steak & Grill",
    meals: [
      {
        title: "Charcoal Ribeye Steak",
        description:
          "Juicy ribeye steak grilled over charcoal and herb butter.",
        categorySlug: "steak",
        dietary: ["Halal", "High-Protein"],
        price: 680,
      },
      {
        title: "Smoked BBQ Beef Ribs",
        description: "Slow smoked beef ribs glazed with signature BBQ sauce.",
        categorySlug: "bbq",
        dietary: ["Halal", "High-Protein"],
        price: 720,
      },
    ],
  },
  {
    providerEmail: "oceancatch@foodhub.com",
    providerName: "Ocean Catch Kitchen",
    cuisine: "Seafood",
    meals: [
      {
        title: "Lemon Butter Grilled Fish",
        description: "Fresh grilled fish fillet with lemon butter sauce.",
        categorySlug: "seafood",
        dietary: ["Halal", "Gluten-Free"],
        price: 460,
      },
      {
        title: "Spicy Garlic Prawn",
        description: "Pan-seared prawns with chili garlic and herbs.",
        categorySlug: "seafood",
        dietary: ["Halal", "Spicy"],
        price: 490,
      },
    ],
  },
  {
    providerEmail: "greenbowl@foodhub.com",
    providerName: "Green Bowl Cafe",
    cuisine: "Healthy",
    meals: [
      {
        title: "Quinoa Chicken Power Bowl",
        description:
          "Grilled chicken, quinoa and roasted veggies with house dressing.",
        categorySlug: "healthy",
        dietary: ["Halal", "High-Protein"],
        price: 350,
      },
      {
        title: "Thai Lemongrass Tofu Bowl",
        description:
          "Tofu, vegetables and lemongrass dressing over brown rice.",
        categorySlug: "thai",
        dietary: ["Vegetarian", "Gluten-Free"],
        price: 300,
      },
    ],
  },
  {
    providerEmail: "streettaco@foodhub.com",
    providerName: "Street Taco Lab",
    cuisine: "Mexican",
    meals: [
      {
        title: "Beef Street Taco Trio",
        description:
          "Three soft-shell tacos with spiced beef and salsa fresca.",
        categorySlug: "mexican",
        dietary: ["Halal", "Spicy"],
        price: 330,
      },
      {
        title: "Chicken Burrito Bowl",
        description: "Mexican rice bowl with chicken, beans and pico de gallo.",
        categorySlug: "mexican",
        dietary: ["Halal"],
        price: 340,
      },
    ],
  },
  {
    providerEmail: "pastapoint@foodhub.com",
    providerName: "Pasta Point",
    cuisine: "Italian",
    meals: [
      {
        title: "Creamy Chicken Alfredo",
        description: "Classic fettuccine alfredo with grilled chicken slices.",
        categorySlug: "italian",
        dietary: ["Halal"],
        price: 390,
      },
      {
        title: "Spaghetti Bolognese",
        description: "Rich beef ragu sauce over al dente spaghetti.",
        categorySlug: "italian",
        dietary: ["Halal"],
        price: 360,
      },
      {
        title: "Margherita Pizza",
        description:
          "Stone-baked pizza with mozzarella, basil and tomato sauce.",
        categorySlug: "pizza",
        dietary: ["Vegetarian"],
        price: 420,
      },
    ],
  },
  {
    providerEmail: "wokflame@foodhub.com",
    providerName: "Wok & Flame",
    cuisine: "Chinese",
    meals: [
      {
        title: "Szechuan Chicken Noodles",
        description:
          "Wok-tossed noodles with chicken, vegetables and szechuan sauce.",
        categorySlug: "chinese",
        dietary: ["Halal", "Spicy"],
        price: 340,
      },
      {
        title: "Thai Basil Chicken Rice",
        description: "Fragrant basil chicken served over jasmine rice.",
        categorySlug: "thai",
        dietary: ["Halal", "Spicy"],
        price: 330,
      },
    ],
  },
  {
    providerEmail: "nawabihandi@foodhub.com",
    providerName: "Nawabi Handi",
    cuisine: "Indian Mughlai",
    meals: [
      {
        title: "Nawabi Beef Handi",
        description:
          "Slow-cooked creamy beef handi with aromatic whole spices.",
        categorySlug: "indian",
        dietary: ["Halal"],
        price: 430,
      },
      {
        title: "Mughlai Chicken Roast",
        description: "Richly spiced chicken roast with saffron gravy.",
        categorySlug: "indian",
        dietary: ["Halal"],
        price: 410,
      },
    ],
  },
  {
    providerEmail: "fitmealbox@foodhub.com",
    providerName: "Fit Meal Box",
    cuisine: "Healthy",
    meals: [
      {
        title: "Grilled Chicken Meal Prep",
        description:
          "Balanced meal with grilled chicken, brown rice and greens.",
        categorySlug: "healthy",
        dietary: ["Halal", "High-Protein"],
        price: 320,
      },
      {
        title: "Overnight Oats Protein Jar",
        description: "Greek yogurt oats jar with fruits and chia seeds.",
        categorySlug: "breakfast",
        dietary: ["Vegetarian", "High-Protein"],
        price: 180,
      },
    ],
  },
  {
    providerEmail: "morningbite@foodhub.com",
    providerName: "Morning Bite Bakery",
    cuisine: "Breakfast",
    meals: [
      {
        title: "Egg & Cheese Croissant",
        description:
          "Buttery croissant filled with fluffy eggs and melted cheese.",
        categorySlug: "breakfast",
        dietary: ["Halal"],
        price: 210,
      },
      {
        title: "Honey French Toast",
        description: "Brioche french toast with honey and seasonal fruits.",
        categorySlug: "breakfast",
        dietary: ["Vegetarian"],
        price: 230,
      },
    ],
  },
  {
    providerEmail: "deshidessert@foodhub.com",
    providerName: "Deshi Dessert Studio",
    cuisine: "Dessert",
    meals: [
      {
        title: "Baked Rosogolla Cheesecake",
        description:
          "Fusion cheesecake with rosogolla topping and saffron glaze.",
        categorySlug: "dessert",
        dietary: ["Vegetarian"],
        price: 280,
      },
      {
        title: "Chocolate Lava Pudding",
        description:
          "Warm chocolate pudding with molten center and vanilla cream.",
        categorySlug: "dessert",
        dietary: ["Vegetarian"],
        price: 250,
      },
    ],
  },
  {
    providerEmail: "wrapstation@foodhub.com",
    providerName: "Wrap Station",
    cuisine: "Wraps",
    meals: [
      {
        title: "Peri Peri Chicken Wrap",
        description:
          "Toasted wrap with peri peri chicken, lettuce and garlic mayo.",
        categorySlug: "wraps",
        dietary: ["Halal", "Spicy"],
        price: 260,
      },
      {
        title: "Falafel Hummus Wrap",
        description: "Crispy falafel wrap with hummus, pickle and tahini.",
        categorySlug: "wraps",
        dietary: ["Vegetarian"],
        price: 240,
      },
      {
        title: "Chicken Supreme Pizza",
        description:
          "Loaded chicken pizza with capsicum, olives and spicy cheese blend.",
        categorySlug: "pizza",
        dietary: ["Halal", "Spicy"],
        price: 480,
      },
    ],
  },
];

const cartSeeds: SeedCart[] = [
  {
    customerEmail: "sadia.akter@gmail.com",
    items: [
      {
        providerEmail: "chillox@foodhub.com",
        mealTitle: "Smash Beef Burger",
        quantity: 2,
      },
      {
        providerEmail: "spiceandrice@foodhub.com",
        mealTitle: "Paneer Tikka Masala",
        quantity: 1,
      },
    ],
  },
  {
    customerEmail: "mahmudul.karim@gmail.com",
    items: [
      {
        providerEmail: "dhakabiryani@foodhub.com",
        mealTitle: "Kacchi Biryani (Full)",
        quantity: 1,
      },
      {
        providerEmail: "rajshahifood@foodhub.com",
        mealTitle: "Beef Kala Bhuna with Polao",
        quantity: 1,
      },
    ],
  },
];

const orderSeeds: SeedOrder[] = [
  {
    code: "SEED-ORD-001",
    customerEmail: "rahim.uddin@gmail.com",
    deliveryAddress: "Dhanmondi 27, Dhaka",
    status: OrderStatus.PENDING,
    paymentStatus: PaymentStatus.UNPAID,
    paymentReference: "seed-pay-001",
    items: [
      {
        providerEmail: "dhakabiryani@foodhub.com",
        mealTitle: "Chicken Tehari",
        quantity: 2,
      },
      {
        providerEmail: "spiceandrice@foodhub.com",
        mealTitle: "Butter Chicken with Naan",
        quantity: 1,
      },
    ],
  },
  {
    code: "SEED-ORD-002",
    customerEmail: "nusrat.jahan@gmail.com",
    deliveryAddress: "Uttara Sector 10, Dhaka",
    status: OrderStatus.PREPARING,
    paymentStatus: PaymentStatus.UNPAID,
    paymentReference: "seed-pay-002",
    items: [
      {
        providerEmail: "rajshahifood@foodhub.com",
        mealTitle: "Morog Polao",
        quantity: 1,
      },
      {
        providerEmail: "chillox@foodhub.com",
        mealTitle: "Chicken Loaded Fries",
        quantity: 2,
      },
    ],
  },
  {
    code: "SEED-ORD-003",
    customerEmail: "tanvir.hasan@gmail.com",
    deliveryAddress: "Kazla, Rajshahi",
    status: OrderStatus.OUT_FOR_DELIVERY,
    paymentStatus: PaymentStatus.PAID,
    paymentReference: "seed-pay-003",
    items: [
      {
        providerEmail: "spiceandrice@foodhub.com",
        mealTitle: "Hyderabadi Chicken Biryani",
        quantity: 1,
      },
      {
        providerEmail: "chillox@foodhub.com",
        mealTitle: "BBQ Chicken Wrap",
        quantity: 1,
      },
    ],
  },
  {
    code: "SEED-ORD-004",
    customerEmail: "farzana.rahman@gmail.com",
    deliveryAddress: "Mirpur DOHS, Dhaka",
    status: OrderStatus.DELIVERED,
    paymentStatus: PaymentStatus.PAID,
    paymentReference: "seed-pay-004",
    scheduleType: "LATER",
    scheduledAt: new Date("2026-04-15T13:00:00.000Z"),
    items: [
      {
        providerEmail: "dhakabiryani@foodhub.com",
        mealTitle: "Kacchi Biryani (Full)",
        quantity: 1,
      },
      {
        providerEmail: "rajshahifood@foodhub.com",
        mealTitle: "Special Mutton Tehari",
        quantity: 1,
      },
    ],
  },
];

const reviewSeeds: SeedReview[] = [
  {
    customerEmail: "rahim.uddin@gmail.com",
    providerEmail: "dhakabiryani@foodhub.com",
    mealTitle: "Kacchi Biryani (Full)",
    rating: 5,
    comment: "Authentic taste and great portion size.",
  },
  {
    customerEmail: "nusrat.jahan@gmail.com",
    providerEmail: "chillox@foodhub.com",
    mealTitle: "Smash Beef Burger",
    rating: 4,
    comment: "Juicy and satisfying, bun could be softer.",
  },
  {
    customerEmail: "sadia.akter@gmail.com",
    providerEmail: "spiceandrice@foodhub.com",
    mealTitle: "Paneer Tikka Masala",
    rating: 5,
    comment: "Perfect spice balance and fresh paneer.",
  },
];

const getUserByEmail = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, role: true },
  });

  if (!user) {
    throw new Error(`User not found: ${email}`);
  }

  return user;
};

const getMeal = async (providerEmail: string, mealTitle: string) => {
  const meal = await prisma.meal.findFirst({
    where: {
      title: mealTitle,
      provider: { email: providerEmail.toLowerCase() },
    },
    select: { id: true, price: true },
  });

  if (!meal) {
    throw new Error(`Meal not found: ${mealTitle} (${providerEmail})`);
  }

  return meal;
};

const seedUsersAndProviders = async () => {
  const headers = new Headers();
  const auth = await getAuth();
  const authSignUpEmail = (
    auth as { api?: { signUpEmail?: Function } } | undefined
  )?.api?.signUpEmail;
  let created = 0;
  let updated = 0;

  for (const user of seedUsers) {
    const email = user.email.toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!existing) {
      if (authSignUpEmail) {
        await authSignUpEmail({
          headers,
          body: {
            name: user.name,
            email,
            password: user.password,
            role: user.role,
          },
        });
      } else {
        await prisma.user.create({
          data: {
            name: user.name,
            email,
            password: user.password,
            role: user.role,
            emailVerified: true,
          },
        });
      }
      created += 1;
    } else {
      await prisma.user.update({
        where: { email },
        data: {
          name: user.name,
          role: user.role,
        },
      });
      updated += 1;
    }

    const persisted = await getUserByEmail(email);
    if (user.role === UserRole.PROVIDER) {
      await prisma.providerProfile.upsert({
        where: { userId: persisted.id },
        update: {
          restaurantName: user.name,
        },
        create: {
          userId: persisted.id,
          restaurantName: user.name,
        },
      });
    }
  }

  return { created, updated };
};

const seedCategories = async () => {
  const categoryBySlug = new Map<string, string>();

  for (const category of categories) {
    const saved = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        ...(category.description !== undefined
          ? { description: category.description }
          : {}),
        ...(category.imageUrl !== undefined
          ? { imageUrl: category.imageUrl }
          : {}),
      },
      create: {
        name: category.name,
        slug: category.slug,
        ...(category.description !== undefined
          ? { description: category.description }
          : {}),
        ...(category.imageUrl !== undefined
          ? { imageUrl: category.imageUrl }
          : {}),
      },
      select: { id: true, slug: true },
    });

    categoryBySlug.set(saved.slug, saved.id);
  }

  return categoryBySlug;
};

const backfillMissingImages = async () => {
  let categoryUpdates = 0;
  let mealUpdates = 0;

  const existingCategories = await prisma.category.findMany({
    select: { id: true, slug: true, imageUrl: true },
  });

  for (const category of existingCategories) {
    if (
      !category.imageUrl?.trim() ||
      category.imageUrl.includes("picsum.photos")
    ) {
      await prisma.category.update({
        where: { id: category.id },
        data: { imageUrl: buildFoodImage("category", category.slug) },
      });
      categoryUpdates += 1;
    }
  }

  const existingMeals = await prisma.meal.findMany({
    select: {
      id: true,
      title: true,
      imageUrl: true,
      category: { select: { slug: true } },
    },
  });

  for (const meal of existingMeals) {
    if (!meal.imageUrl?.trim() || meal.imageUrl.includes("picsum.photos")) {
      await prisma.meal.update({
        where: { id: meal.id },
        data: {
          imageUrl: buildFoodImage(
            "meal",
            `${meal.category.slug}-${meal.title}`,
          ),
        },
      });
      mealUpdates += 1;
    }
  }

  return { categoryUpdates, mealUpdates };
};

const ensureEveryCategoryHasMeals = async () => {
  const defaultProvider = await prisma.user.findFirst({
    where: { role: UserRole.PROVIDER },
    select: { id: true },
  });

  if (!defaultProvider) {
    throw new Error("No provider found to create fallback meals.");
  }

  const categoriesInDb = await prisma.category.findMany({
    select: { id: true, name: true, slug: true },
  });

  const mealCountByCategoryRows = await prisma.meal.groupBy({
    by: ["categoryId"],
    _count: { _all: true },
  });

  const mealCountByCategory = new Map<string, number>();
  for (const row of mealCountByCategoryRows) {
    mealCountByCategory.set(row.categoryId, row._count._all);
  }

  let fallbackMealsCreated = 0;

  for (const category of categoriesInDb) {
    const mealCount = mealCountByCategory.get(category.id) ?? 0;
    if (mealCount > 0) {
      continue;
    }

    const fallbackTitle = `${category.name} Special`;
    const existingFallback = await prisma.meal.findFirst({
      where: {
        providerId: defaultProvider.id,
        categoryId: category.id,
        title: fallbackTitle,
      },
      select: { id: true },
    });

    if (existingFallback) {
      continue;
    }

    await prisma.meal.create({
      data: {
        providerId: defaultProvider.id,
        categoryId: category.id,
        title: fallbackTitle,
        description: `Chef-curated demo meal for ${category.name} category.`,
        dietary: ["Halal"],
        price: new Prisma.Decimal(299),
        imageUrl: buildFoodImage("meal", `${category.slug}-${fallbackTitle}`),
        isAvailable: true,
      },
    });

    fallbackMealsCreated += 1;
  }

  return { fallbackMealsCreated };
};

const seedMeals = async (categoryBySlug: Map<string, string>) => {
  let created = 0;
  let updated = 0;

  for (const providerSeed of providerMeals) {
    const provider = await getUserByEmail(providerSeed.providerEmail);
    if (provider.role !== UserRole.PROVIDER) {
      throw new Error(`User is not a provider: ${providerSeed.providerEmail}`);
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
        throw new Error(`Category not found for slug: ${meal.categorySlug}`);
      }

      const existing = await prisma.meal.findFirst({
        where: {
          providerId: provider.id,
          title: meal.title,
        },
        select: { id: true },
      });

      if (!existing) {
        await prisma.meal.create({
          data: {
            providerId: provider.id,
            categoryId,
            title: meal.title,
            description: meal.description,
            dietary: meal.dietary,
            price: meal.price,
            imageUrl:
              meal.imageUrl ??
              buildFoodImage("meal", `${meal.categorySlug}-${meal.title}`),
            isAvailable: meal.isAvailable ?? true,
          },
        });
        created += 1;
      } else {
        await prisma.meal.update({
          where: { id: existing.id },
          data: {
            categoryId,
            description: meal.description,
            dietary: meal.dietary,
            price: meal.price,
            imageUrl:
              meal.imageUrl ??
              buildFoodImage("meal", `${meal.categorySlug}-${meal.title}`),
            isAvailable: meal.isAvailable ?? true,
          },
        });
        updated += 1;
      }
    }
  }

  return { created, updated };
};

const seedCarts = async () => {
  let upserts = 0;

  for (const cart of cartSeeds) {
    const customer = await getUserByEmail(cart.customerEmail);
    if (customer.role !== UserRole.CUSTOMER) {
      throw new Error(
        `Cart seed requires customer role: ${cart.customerEmail}`,
      );
    }

    for (const item of cart.items) {
      const meal = await getMeal(item.providerEmail, item.mealTitle);
      await prisma.cartItem.upsert({
        where: {
          customerId_mealId: {
            customerId: customer.id,
            mealId: meal.id,
          },
        },
        update: {
          quantity: item.quantity,
        },
        create: {
          customerId: customer.id,
          mealId: meal.id,
          quantity: item.quantity,
        },
      });
      upserts += 1;
    }
  }

  return upserts;
};

const seedOrders = async () => {
  let created = 0;
  let updated = 0;

  for (const orderSeed of orderSeeds) {
    const customer = await getUserByEmail(orderSeed.customerEmail);
    if (customer.role !== UserRole.CUSTOMER) {
      throw new Error(
        `Order seed requires customer role: ${orderSeed.customerEmail}`,
      );
    }

    const items = [];
    let totalAmount = new Prisma.Decimal(0);

    for (const item of orderSeed.items) {
      const meal = await getMeal(item.providerEmail, item.mealTitle);
      const unitPrice = new Prisma.Decimal(meal.price);
      const subTotal = unitPrice.mul(item.quantity);
      totalAmount = totalAmount.plus(subTotal);

      items.push({
        mealId: meal.id,
        quantity: item.quantity,
        unitPrice,
        subTotal,
      });
    }

    const existing = orderSeed.paymentReference
      ? await prisma.order.findUnique({
          where: { paymentReference: orderSeed.paymentReference },
          select: { id: true },
        })
      : await prisma.order.findFirst({
          where: {
            customerId: customer.id,
            note: orderSeed.code,
          },
          select: { id: true },
        });

    if (!existing) {
      await prisma.order.create({
        data: {
          customerId: customer.id,
          totalAmount,
          paymentStatus: orderSeed.paymentStatus ?? PaymentStatus.UNPAID,
          status: orderSeed.status,
          deliveryAddress: orderSeed.deliveryAddress,
          note: orderSeed.code,
          scheduleType: orderSeed.scheduleType ?? "NOW",
          ...(orderSeed.paymentReference !== undefined
            ? { paymentReference: orderSeed.paymentReference }
            : {}),
          ...(orderSeed.scheduledAt !== undefined
            ? { scheduledAt: orderSeed.scheduledAt }
            : {}),
          items: { create: items },
        },
      });
      created += 1;
    } else {
      await prisma.order.update({
        where: { id: existing.id },
        data: {
          totalAmount,
          paymentStatus: orderSeed.paymentStatus ?? PaymentStatus.UNPAID,
          status: orderSeed.status,
          deliveryAddress: orderSeed.deliveryAddress,
          note: orderSeed.code,
          scheduleType: orderSeed.scheduleType ?? "NOW",
          ...(orderSeed.scheduledAt !== undefined
            ? { scheduledAt: orderSeed.scheduledAt }
            : {}),
          items: {
            deleteMany: {},
            create: items,
          },
        },
      });
      updated += 1;
    }
  }

  return { created, updated };
};

const seedReviews = async () => {
  let upserts = 0;

  for (const review of reviewSeeds) {
    const customer = await getUserByEmail(review.customerEmail);
    const meal = await getMeal(review.providerEmail, review.mealTitle);

    await prisma.review.upsert({
      where: {
        customerId_mealId: {
          customerId: customer.id,
          mealId: meal.id,
        },
      },
      update: {
        rating: review.rating,
        ...(review.comment !== undefined ? { comment: review.comment } : {}),
      },
      create: {
        customerId: customer.id,
        mealId: meal.id,
        rating: review.rating,
        ...(review.comment !== undefined ? { comment: review.comment } : {}),
      },
    });

    upserts += 1;
  }

  return upserts;
};

const seedAuditLogs = async () => {
  const admin = await prisma.user.findUnique({
    where: { email: "admin@foodhub.com" },
    select: { id: true },
  });

  if (!admin) {
    return 0;
  }

  const entries = [
    {
      actorId: admin.id,
      actorRole: UserRole.ADMIN,
      action: "SEED_USERS",
      entityType: "USER",
      entityId: null,
      metadata: { source: "scripts/seed.ts", count: seedUsers.length },
    },
    {
      actorId: admin.id,
      actorRole: UserRole.ADMIN,
      action: "SEED_MEALS",
      entityType: "MEAL",
      entityId: null,
      metadata: { source: "scripts/seed.ts" },
    },
  ];

  let created = 0;
  for (const entry of entries) {
    const exists = await prisma.auditLog.findFirst({
      where: {
        actorId: entry.actorId,
        action: entry.action,
        entityType: entry.entityType,
      },
      select: { id: true },
    });

    if (!exists) {
      await prisma.auditLog.create({ data: entry });
      created += 1;
    }
  }

  return created;
};

const runSeed = async () => {
  const userResult = await seedUsersAndProviders();
  const categoryBySlug = await seedCategories();
  const mealResult = await seedMeals(categoryBySlug);
  const coverageResult = await ensureEveryCategoryHasMeals();
  const visualResult = await backfillMissingImages();
  const cartUpserts = await seedCarts();
  const orderResult = await seedOrders();
  const reviewUpserts = await seedReviews();
  const auditCreated = await seedAuditLogs();

  console.log("Seed completed successfully.");
  console.log(
    `Users -> created: ${userResult.created}, updated: ${userResult.updated}`,
  );
  console.log(
    `Meals -> created: ${mealResult.created}, updated: ${mealResult.updated}`,
  );
  console.log(
    `Coverage -> fallback meals created for empty categories: ${coverageResult.fallbackMealsCreated}`,
  );
  console.log(
    `Visuals -> category images backfilled: ${visualResult.categoryUpdates}, meal images backfilled: ${visualResult.mealUpdates}`,
  );
  console.log(`Cart upserts -> ${cartUpserts}`);
  console.log(
    `Orders -> created: ${orderResult.created}, updated: ${orderResult.updated}`,
  );
  console.log(`Reviews upserts -> ${reviewUpserts}`);
  console.log(`Audit logs created -> ${auditCreated}`);
};

runSeed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
