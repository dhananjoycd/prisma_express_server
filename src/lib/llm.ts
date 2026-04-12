import OpenAI from "openai";
import { env } from "./env";

type JsonOptions = {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  cacheTtlMs?: number;
};

const hasLlmConfig = Boolean(env.LLM_API_KEY?.trim());

const client = hasLlmConfig
  ? new OpenAI({
      apiKey: env.LLM_API_KEY,
      ...(env.LLM_BASE_URL ? { baseURL: env.LLM_BASE_URL } : {}),
    })
  : null;

const model = env.LLM_MODEL || "gpt-4o-mini";
const timeout = env.LLM_TIMEOUT_MS ?? 12000;
const isGeminiModel = /gemini/i.test(model);
const isGeminiBase = /generativelanguage\.googleapis\.com/i.test(
  env.LLM_BASE_URL ?? "",
);
const useNativeJsonMode = !(isGeminiModel || isGeminiBase);

type CacheEntry = {
  expiresAt: number;
  value: unknown;
};

const cache = new Map<string, CacheEntry>();
const defaultCacheTtlMs = 5 * 60 * 1000;
const maxCacheEntries = 200;

const hashString = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16);
};

const extractJsonObject = (raw: string) => {
  const trimmed = raw.trim();

  const fencedJsonMatch = trimmed.match(/```json\s*([\s\S]*?)```/i);
  if (fencedJsonMatch?.[1]) {
    return fencedJsonMatch[1].trim();
  }

  const fencedMatch = trimmed.match(/```\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) {
    return trimmed.slice(first, last + 1);
  }

  return trimmed;
};

const pruneCache = () => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }

  if (cache.size <= maxCacheEntries) {
    return;
  }

  const overflow = cache.size - maxCacheEntries;
  const keys = Array.from(cache.keys()).slice(0, overflow);
  for (const key of keys) {
    cache.delete(key);
  }
};

export const LlmService = {
  isEnabled() {
    return client !== null;
  },

  async json<T>({
    systemPrompt,
    userPrompt,
    maxTokens = 600,
    temperature = 0.2,
    cacheTtlMs = defaultCacheTtlMs,
  }: JsonOptions): Promise<T | null> {
    if (!client) {
      return null;
    }

    const cacheKey = hashString(
      JSON.stringify({
        model,
        systemPrompt,
        userPrompt,
        maxTokens,
        temperature,
      }),
    );
    const now = Date.now();
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.value as T;
    }

    const tryCompletion = async (attempt: 1 | 2) => {
      const strictSystemPrompt =
        attempt === 1
          ? systemPrompt
          : `${systemPrompt}\n\nSTRICT MODE: return exactly one valid JSON object only. No markdown, no prose.`;

      const completion = await client.chat.completions.create(
        {
          model,
          temperature: attempt === 1 ? temperature : 0,
          max_tokens: Math.min(
            Math.max(Math.trunc(maxTokens) + (attempt === 2 ? 140 : 0), 96),
            1400,
          ),
          ...(useNativeJsonMode
            ? { response_format: { type: "json_object" as const } }
            : {}),
          messages: [
            { role: "system", content: strictSystemPrompt },
            { role: "user", content: userPrompt },
          ],
        },
        {
          timeout,
        },
      );

      return completion.choices[0]?.message?.content ?? null;
    };

    try {
      const firstRaw = await tryCompletion(1);
      if (firstRaw) {
        const firstNormalized = extractJsonObject(firstRaw);
        try {
          const value = JSON.parse(firstNormalized) as T;
          if (cacheTtlMs > 0) {
            cache.set(cacheKey, {
              expiresAt: now + cacheTtlMs,
              value,
            });
            pruneCache();
          }
          return value;
        } catch {
          // Try one strict retry.
        }
      }

      const secondRaw = await tryCompletion(2);
      if (!secondRaw) {
        return null;
      }

      const secondNormalized = extractJsonObject(secondRaw);
      const value = JSON.parse(secondNormalized) as T;

      if (cacheTtlMs > 0) {
        cache.set(cacheKey, {
          expiresAt: now + cacheTtlMs,
          value,
        });
        pruneCache();
      }

      return value;
    } catch {
      return null;
    }
  },
};
