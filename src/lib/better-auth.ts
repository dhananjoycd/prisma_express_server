import { UserRole, UserStatus } from "../../generated/prisma/enums.js";
import { env, parseOriginList } from "./env";
import { prisma } from "./prisma";

type BetterAuthInstance = {
  api: any;
};

const appBaseUrl = env.BETTER_AUTH_URL ?? `http://localhost:${env.PORT}`;

const trustedAppUrls = parseOriginList(env.APP_URL);
const trustedOrigins = Array.from(new Set([...trustedAppUrls, appBaseUrl]));

const googleClientId = env.GOOGLE_CLIENT_ID;
const googleClientSecret = env.GOOGLE_CLIENT_SECRET;

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
    secret: env.BETTER_AUTH_SECRET ?? env.JWT_SECRET,
    database: prismaAdapter(prisma, {
      provider: "postgresql",
    }),
    trustedOrigins,
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
