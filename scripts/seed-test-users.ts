import "dotenv/config";
import { UserRole } from "../generated/prisma/enums.js";
import { auth } from "../src/lib/better-auth";
import { prisma } from "../src/lib/prisma";

type SeedUser = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
};

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

const seed = async () => {
  const headers = new Headers();
  let createdCount = 0;
  let updatedCount = 0;

  for (const user of seedUsers) {
    const email = user.email.toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!existing) {
      await auth.api.signUpEmail({
        headers,
        body: {
          name: user.name,
          email,
          password: user.password,
          role: user.role,
        },
      });
      createdCount += 1;
    } else {
      await prisma.user.update({
        where: { email },
        data: {
          name: user.name,
          role: user.role,
        },
      });
      updatedCount += 1;
    }

    const persisted = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!persisted) {
      throw new Error(`User not found after seed: ${email}`);
    }

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

  console.log(`Seed complete. Created: ${createdCount}, Updated: ${updatedCount}`);
};

seed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
