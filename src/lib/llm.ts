import { env } from "./env";

type JsonOptions = {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  cacheTtlMs?: number;
};

export type AssistantMeta = {
  source: "gemini" | "local";
  label: "Rayna GV2.5" | "Rayna LV1.1";
  model: string;
};

type CachedValue = {
  expiresAt: number;
  value: unknown;
  assistant: AssistantMeta;
};

type GeminiRequestResult = {
  text: string | null;
  model: string | null;
};

const GEMINI_LABEL = "Rayna GV2.5";
const LOCAL_LABEL = "Rayna LV1.1";
const DEFAULT_GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";

const geminiApiKey = env.GEMINI_API_KEY?.trim() || env.LLM_API_KEY?.trim() || "";
const geminiPrimaryModel =
  env.GEMINI_MODEL?.trim() || env.LLM_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
const geminiConfiguredModels = (env.GEMINI_MODELS?.split(",") ?? [])
  .map((item) => item.trim())
  .filter(Boolean);
const geminiModels = Array.from(
  new Set([geminiPrimaryModel, ...geminiConfiguredModels]),
);
const hasGeminiConfig = Boolean(geminiApiKey);
const timeoutMs = env.GEMINI_TIMEOUT_MS ?? env.LLM_TIMEOUT_MS ?? 12000;

const LOCAL_ASSISTANT_META: AssistantMeta = {
  source: "local",
  label: LOCAL_LABEL,
  model: "local-fallback",
};

const normalizeBaseUrl = (raw?: string) => {
  const trimmed = raw?.trim();
  if (!trimmed) return DEFAULT_GEMINI_BASE_URL;

  return trimmed
    .replace(/\/openai\/?$/i, "")
    .replace(/\/+$/, "");
};

const geminiBaseUrl = normalizeBaseUrl(env.GEMINI_BASE_URL ?? env.LLM_BASE_URL);

const cache = new Map<string, CachedValue>();
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

const extractGeminiText = (payload: unknown) => {
  if (!payload || typeof payload !== "object") return null;

  const candidates = (payload as { candidates?: unknown[] }).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return null;
  }

  const parts = (
    candidates[0] as {
      content?: { parts?: Array<{ text?: string }> };
    }
  ).content?.parts;

  if (!Array.isArray(parts)) {
    return null;
  }

  return parts
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();
};

async function requestGeminiJson(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  temperature: number,
): Promise<GeminiRequestResult> {
  if (!hasGeminiConfig || !geminiApiKey) {
    return { text: null, model: null };
  }

  for (const model of geminiModels) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(
        `${geminiBaseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemPrompt }],
            },
            contents: [
              {
                role: "user",
                parts: [{ text: userPrompt }],
              },
            ],
            generationConfig: {
              temperature,
              maxOutputTokens: Math.min(Math.max(Math.trunc(maxTokens), 96), 1400),
              responseMimeType: "application/json",
            },
          }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        continue;
      }

      const payload = (await response.json()) as unknown;
      const text = extractGeminiText(payload);
      if (text) {
        return { text, model };
      }
    } catch {
      // Try the next configured model.
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return { text: null, model: null };
}

export const LlmService = {
  isEnabled() {
    return hasGeminiConfig;
  },

  localAssistant() {
    return LOCAL_ASSISTANT_META;
  },

  async json<T>({
    systemPrompt,
    userPrompt,
    maxTokens = 600,
    temperature = 0.2,
    cacheTtlMs = defaultCacheTtlMs,
  }: JsonOptions): Promise<{ data: T | null; assistant: AssistantMeta }> {
    if (!hasGeminiConfig) {
      return {
        data: null,
        assistant: LOCAL_ASSISTANT_META,
      };
    }

    const cacheKey = hashString(
      JSON.stringify({
        models: geminiModels,
        systemPrompt,
        userPrompt,
        maxTokens,
        temperature,
      }),
    );
    const now = Date.now();
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return {
        data: cached.value as T,
        assistant: cached.assistant,
      };
    }

    const tryPrompt = async (attempt: 1 | 2) => {
      const strictSystemPrompt =
        attempt === 1
          ? systemPrompt
          : `${systemPrompt}\n\nSTRICT MODE: return exactly one valid JSON object only. No markdown, no prose.`;

      return requestGeminiJson(
        strictSystemPrompt,
        userPrompt,
        maxTokens + (attempt === 2 ? 140 : 0),
        attempt === 1 ? temperature : 0,
      );
    };

    try {
      const firstAttempt = await tryPrompt(1);
      if (firstAttempt.text) {
        const normalized = extractJsonObject(firstAttempt.text);
        try {
          const value = JSON.parse(normalized) as T;
          const assistant: AssistantMeta = {
            source: "gemini",
            label: GEMINI_LABEL,
            model: firstAttempt.model ?? geminiPrimaryModel,
          };

          if (cacheTtlMs > 0) {
            cache.set(cacheKey, {
              expiresAt: now + cacheTtlMs,
              value,
              assistant,
            });
            pruneCache();
          }

          return {
            data: value,
            assistant,
          };
        } catch {
          // Retry once with a stricter prompt.
        }
      }

      const secondAttempt = await tryPrompt(2);
      if (!secondAttempt.text) {
        return {
          data: null,
          assistant: LOCAL_ASSISTANT_META,
        };
      }

      const value = JSON.parse(extractJsonObject(secondAttempt.text)) as T;
      const assistant: AssistantMeta = {
        source: "gemini",
        label: GEMINI_LABEL,
        model: secondAttempt.model ?? geminiPrimaryModel,
      };

      if (cacheTtlMs > 0) {
        cache.set(cacheKey, {
          expiresAt: now + cacheTtlMs,
          value,
          assistant,
        });
        pruneCache();
      }

      return {
        data: value,
        assistant,
      };
    } catch {
      return {
        data: null,
        assistant: LOCAL_ASSISTANT_META,
      };
    }
  },
};
