import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer } from "better-auth/plugins";
import { UserRole, UserStatus } from "../../generated/prisma/enums.js";
import { prisma } from "./prisma";

const appBaseUrl =
  process.env.BETTER_AUTH_URL ??
  `http://localhost:${process.env.PORT ?? "5000"}`;

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

export const auth = betterAuth({
  appName: "FoodHub",
  baseURL: appBaseUrl,
  basePath: "/api/v1/auth",
  secret: process.env.BETTER_AUTH_SECRET ?? process.env.JWT_SECRET,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  trustedOrigins: [process.env.APP_URL ?? "http://localhost:3000", appBaseUrl],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  ...(googleClientId && googleClientSecret
    ? {
        socialProviders: {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        },
      }
    : {}),
  user: {
    modelName: "User",
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: UserRole.CUSTOMER,
      },
      status: {
        type: "string",
        required: false,
        defaultValue: UserStatus.ACTIVE,
        input: false,
      },
      phone: {
        type: "string",
        required: false,
      },
      address: {
        type: "string",
        required: false,
      },
    },
  },
  session: {
    modelName: "Session",
  },
  account: {
    modelName: "Account",
  },
  verification: {
    modelName: "Verification",
  },
  plugins: [bearer()],
});

