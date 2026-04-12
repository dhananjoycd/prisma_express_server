import "dotenv/config";
import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z
      .string()
      .regex(/^\d+$/, "PORT must be a number")
      .default("5000")
      .transform((value) => Number(value)),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    APP_URL: z.string().min(1, "APP_URL is required"),
    BETTER_AUTH_URL: z.string().url().optional(),
    BETTER_AUTH_SECRET: z.string().min(16).optional(),
    JWT_SECRET: z.string().min(16).optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    STRIPE_SUCCESS_URL: z.string().optional(),
    STRIPE_CANCEL_URL: z.string().optional(),
    LLM_API_KEY: z.string().optional(),
    LLM_MODEL: z.string().optional(),
    LLM_BASE_URL: z.string().url().optional(),
    LLM_TIMEOUT_MS: z
      .string()
      .regex(/^\d+$/, "LLM_TIMEOUT_MS must be a number")
      .optional()
      .transform((value) => (value ? Number(value) : undefined)),
  })
  .superRefine((value, ctx) => {
    if (!value.BETTER_AUTH_SECRET && !value.JWT_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either BETTER_AUTH_SECRET or JWT_SECRET must be provided",
      });
    }
  });

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => issue.message).join("; ");
  throw new Error(`Invalid environment variables: ${issues}`);
}

export const env = parsed.data;

export const parseOriginList = (
  raw: string,
  fallback: string[] = ["http://localhost:3000"],
) => {
  const origins = raw
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((origin) => origin.replace(/\/+$/, ""));

  if (origins.length === 0) {
    return fallback;
  }

  return Array.from(new Set(origins));
};
