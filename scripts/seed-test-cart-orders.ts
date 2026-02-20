import "dotenv/config";
import { OrderStatus } from "../generated/prisma/enums.js";
import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../src/lib/prisma";

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
  items: Array<{
    providerEmail: string;
    mealTitle: string;
    quantity: number;
  }>;
};

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

const seedCart = async () => {
  let cartUpserts = 0;

  for (const cart of cartSeeds) {
    const customer = await prisma.user.findUnique({
      where: { email: cart.customerEmail.toLowerCase() },
      select: { id: true },
    });

    if (!customer) {
      throw new Error(`Customer not found: ${cart.customerEmail}`);
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
        update: { quantity: item.quantity },
        create: {
          customerId: customer.id,
          mealId: meal.id,
          quantity: item.quantity,
        },
      });
      cartUpserts += 1;
    }
  }

  return cartUpserts;
};

const seedOrders = async () => {
  let created = 0;
  let skipped = 0;

  for (const orderSeed of orderSeeds) {
    const customer = await prisma.user.findUnique({
      where: { email: orderSeed.customerEmail.toLowerCase() },
      select: { id: true },
    });

    if (!customer) {
      throw new Error(`Customer not found: ${orderSeed.customerEmail}`);
    }

    const existing = await prisma.order.findFirst({
      where: {
        customerId: customer.id,
        note: orderSeed.code,
      },
      select: { id: true },
    });

    if (existing) {
      skipped += 1;
      continue;
    }

    const items = [];
    let total = new Prisma.Decimal(0);

    for (const seedItem of orderSeed.items) {
      const meal = await getMeal(seedItem.providerEmail, seedItem.mealTitle);
      const unitPrice = new Prisma.Decimal(meal.price);
      const subTotal = unitPrice.mul(seedItem.quantity);
      total = total.plus(subTotal);

      items.push({
        mealId: meal.id,
        quantity: seedItem.quantity,
        unitPrice,
        subTotal,
      });
    }

    await prisma.order.create({
      data: {
        customerId: customer.id,
        deliveryAddress: orderSeed.deliveryAddress,
        status: orderSeed.status,
        note: orderSeed.code,
        totalAmount: total,
        items: {
          create: items,
        },
      },
    });

    created += 1;
  }

  return { created, skipped };
};

const run = async () => {
  const cartUpserts = await seedCart();
  const orderResult = await seedOrders();

  console.log(
    `Cart/Order seed complete. Cart upserts: ${cartUpserts}, Orders created: ${orderResult.created}, Orders skipped: ${orderResult.skipped}`,
  );
};

run()
  .catch((error) => {
    console.error("Cart/Order seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
