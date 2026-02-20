import { UserRole, UserStatus } from "../../generated/prisma/enums.js";
import { prisma } from "./prisma";

type BetterAuthInstance = {
  api: any;
};

const appBaseUrl =
  process.env.BETTER_AUTH_URL ??
  `http://localhost:${process.env.PORT ?? "5000"}`;

function sanitizeOrigin(value: string | undefined, fallback: string) {
  const firstChunk = (value ?? fallback).split(",")[0] ?? fallback;
  const firstLine = firstChunk.split(/\r?\n/)[0] ?? fallback;
  const clean = firstLine.trim();
  return clean || fallback;
}

const trustedAppUrl = sanitizeOrigin(process.env.APP_URL, "http://localhost:3000");

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

let authInstancePromise: Promise<any> | null = null;

async function createAuthInstance(): Promise<any> {
  const [{ betterAuth }, { prismaAdapter }, { bearer }] = await Promise.all([
    import("better-auth"),
    import("better-auth/adapters/prisma"),
    import("better-auth/plugins"),
  ]);

  return betterAuth({
    appName: "FoodHub",
    baseURL: appBaseUrl,
    basePath: "/api/v1/auth",
    secret: process.env.BETTER_AUTH_SECRET ?? process.env.JWT_SECRET,
    database: prismaAdapter(prisma, {
      provider: "postgresql",
    }),
    trustedOrigins: [trustedAppUrl, appBaseUrl],
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
}

export async function getAuth(): Promise<any> {
  if (!authInstancePromise) {
    authInstancePromise = createAuthInstance();
  }
  return authInstancePromise;
}
