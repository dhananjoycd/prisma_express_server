import { Request } from "express";
import { UserRole, UserStatus } from "../../../generated/prisma/enums.js";
import { auth } from "../../lib/better-auth";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { toFetchHeaders } from "../../utils/http";
import {
  loginSchema,
  registerSchema,
  socialLoginSchema,
} from "./auth.validation";

const getRole = (value: unknown): UserRole => {
  if (value === UserRole.ADMIN) {
    return UserRole.ADMIN;
  }

  if (value === UserRole.PROVIDER) {
    return UserRole.PROVIDER;
  }

  return UserRole.CUSTOMER;
};

const getStatus = (value: unknown): UserStatus => {
  if (value === UserStatus.SUSPENDED) {
    return UserStatus.SUSPENDED;
  }

  return UserStatus.ACTIVE;
};

const sanitizeUser = (user: Record<string, unknown>) => ({
  id: String(user.id),
  name: String(user.name),
  email: String(user.email),
  role: getRole(user.role),
  status: getStatus(user.status),
  image: typeof user.image === "string" ? user.image : null,
});

type AuthApiResponse<T> = {
  headers: Headers;
  response: T;
};

const ensureRole = (role: unknown): UserRole | undefined => {
  if (role === undefined) {
    return undefined;
  }

  if (role !== UserRole.CUSTOMER && role !== UserRole.PROVIDER) {
    throw new AppError("Only CUSTOMER or PROVIDER can self-register", 400);
  }

  return role;
};

const assertRecordUser = (value: unknown) => {
  if (!value || typeof value !== "object" || !("user" in value)) {
    throw new AppError("Invalid auth response", 500);
  }

  return value as { user: Record<string, unknown> };
};

export const AuthService = {
  async register(req: Request): Promise<
    AuthApiResponse<{
      token: string | null;
      user: ReturnType<typeof sanitizeUser>;
    }>
  > {
    const payload = registerSchema.parse(req.body);

    const role = ensureRole(payload.role) ?? UserRole.CUSTOMER;
    const result = await auth.api.signUpEmail({
      headers: toFetchHeaders(req),
      body: {
        name: payload.name,
        email: payload.email.toLowerCase(),
        password: payload.password,
        role,
      },
      returnHeaders: true,
    });

    const typed = assertRecordUser(result.response);
    const sanitizedUser = sanitizeUser(typed.user);

    if (sanitizedUser.role === UserRole.PROVIDER) {
      await prisma.providerProfile.upsert({
        where: { userId: sanitizedUser.id },
        update: {},
        create: {
          userId: sanitizedUser.id,
          restaurantName: sanitizedUser.name,
        },
      });
    }

    return {
      headers: result.headers,
      response: {
        token:
          "token" in result.response && typeof result.response.token === "string"
            ? result.response.token
            : null,
        user: sanitizedUser,
      },
    };
  },

  async login(req: Request): Promise<
    AuthApiResponse<{
      token: string;
      user: ReturnType<typeof sanitizeUser>;
    }>
  > {
    const payload = loginSchema.parse(req.body);

    const result = await auth.api.signInEmail({
      headers: toFetchHeaders(req),
      body: {
        email: payload.email.toLowerCase(),
        password: payload.password,
      },
      returnHeaders: true,
    });

    const typed = assertRecordUser(result.response);
    const token = "token" in result.response ? result.response.token : undefined;
    if (typeof token !== "string") {
      throw new AppError("Invalid auth response token", 500);
    }

    return {
      headers: result.headers,
      response: {
        token,
        user: sanitizeUser(typed.user),
      },
    };
  },

  async me(req: Request) {
    const session = await auth.api.getSession({
      headers: toFetchHeaders(req),
    });

    if (!session?.user) {
      throw new AppError("Unauthorized", 401);
    }

    return {
      session: session.session,
      user: sanitizeUser(session.user as unknown as Record<string, unknown>),
    };
  },

  async signOut(req: Request): Promise<AuthApiResponse<{ success: boolean }>> {
    const result = await auth.api.signOut({
      headers: toFetchHeaders(req),
      returnHeaders: true,
    });

    return {
      headers: result.headers,
      response: {
        success:
          "success" in result.response
            ? Boolean(result.response.success)
            : true,
      },
    };
  },

  async googleSignIn(req: Request): Promise<
    AuthApiResponse<{
      url: string;
      redirect: boolean;
    }>
  > {
    const payload = socialLoginSchema.parse(req.body ?? {});

    const result = await auth.api.signInSocial({
      headers: toFetchHeaders(req),
      body: {
        provider: "google",
        callbackURL: payload.callbackURL,
      },
      returnHeaders: true,
    });

    const response = result.response as { url?: unknown; redirect?: unknown };
    if (typeof response.url !== "string") {
      throw new AppError(
        "Google provider is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
        500,
      );
    }

    return {
      headers: result.headers,
      response: {
        url: response.url,
        redirect: response.redirect === true,
      },
    };
  },
};

