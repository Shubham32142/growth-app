/**
 * Multi-provider LLM layer for BYOK (bring-your-own-key).
 *
 * Each user supplies their own API key for one provider. This module exposes a
 * single `chatJSON()` entry point that dispatches to the right provider's HTTP
 * API and returns the raw text content (the caller parses it as JSON via
 * `parseJsonLoose`). All providers are called over plain `fetch` — no SDKs — to
 * match the rest of the codebase and keep the bundle lean.
 */

export type AiProvider = "openai" | "anthropic" | "google" | "openrouter";

export interface ProviderConfig {
  provider: AiProvider;
  apiKey: string;
  model: string;
}

/**
 * Browser-safe metadata (no secrets) for the settings UI: labels, default and
 * preset models, key hints, and where to get a key. Keep model lists short and
 * current; users can also type a custom model id.
 */
export const PROVIDER_META: Record<
  AiProvider,
  {
    label: string;
    defaultModel: string;
    models: string[];
    keyHint: string;
    keysUrl: string;
  }
> = {
  openai: {
    label: "OpenAI (ChatGPT)",
    defaultModel: "gpt-4o-mini",
    models: ["gpt-4o-mini", "gpt-5.4-nano", "gpt-5.4-mini", "gpt-5.4"],
    keyHint: "sk-…",
    keysUrl: "https://platform.openai.com/api-keys",
  },
  anthropic: {
    label: "Anthropic (Claude)",
    defaultModel: "claude-haiku-4-5",
    models: ["claude-haiku-4-5", "claude-sonnet-4-6", "claude-opus-4-8"],
    keyHint: "sk-ant-…",
    keysUrl: "https://console.anthropic.com/settings/keys",
  },
  google: {
    label: "Google (Gemini)",
    defaultModel: "gemini-2.5-flash",
    models: [
      "gemini-2.5-flash",
      "gemini-2.5-pro",
      "gemini-3.5-flash",
      "gemini-3.1-flash-lite",
    ],
    keyHint: "AIza…",
    keysUrl: "https://aistudio.google.com/app/apikey",
  },
  openrouter: {
    label: "OpenRouter",
    defaultModel: "openai/gpt-oss-20b:free",
    models: [
      "openai/gpt-oss-20b:free",
      "openai/gpt-oss-120b:free",
      "cohere/north-mini-code:free",
    ],
    keyHint: "sk-or-…",
    keysUrl: "https://openrouter.ai/keys",
  },
};

export const AI_PROVIDERS = Object.keys(PROVIDER_META) as AiProvider[];

export function isAiProvider(v: unknown): v is AiProvider {
  return typeof v === "string" && (AI_PROVIDERS as string[]).includes(v);
}

/**
 * Tolerant JSON parser for LLM output. Free/small models frequently wrap JSON
 * in markdown fences, prefix it with prose, or emit a `<think>…</think>` block.
 * Strips those and, as a last resort, salvages the outermost {...} / [...].
 */
export function parseJsonLoose<T = unknown>(raw: string): T | null {
  if (!raw) return null;
  let s = raw.trim();
  s = s.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  try {
    return JSON.parse(s) as T;
  } catch {
    /* fall through */
  }
  const first = s.search(/[{[]/);
  const last = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
  if (first !== -1 && last > first) {
    try {
      return JSON.parse(s.slice(first, last + 1)) as T;
    } catch {
      /* give up */
    }
  }
  return null;
}

export interface ChatOptions {
  system: string;
  user: string;
  maxTokens: number;
  /** Only applied to OpenAI/OpenRouter (Anthropic 4.7+/Gemini ignore it). */
  temperature?: number;
  /** Ask the provider for JSON output where supported. Default true. */
  jsonObject?: boolean;
}

export interface ChatResult {
  text: string;
  modelUsed: string;
}

const TIMEOUT_MS = 60_000;

async function postJSON(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  provider: AiProvider,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return res;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`${provider} request timed out after ${TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Dispatch a single system+user chat completion to the configured provider and
 * return the raw text content. Throws on HTTP/transport errors; an empty/odd
 * body returns `{ text: "" }` so the caller's loose-parse + retry handles it.
 */
export async function chatJSON(
  cfg: ProviderConfig,
  opts: ChatOptions,
): Promise<ChatResult> {
  switch (cfg.provider) {
    case "openai":
    case "openrouter":
      return openaiCompatChat(cfg, opts);
    case "anthropic":
      return anthropicChat(cfg, opts);
    case "google":
      return googleChat(cfg, opts);
    default:
      throw new Error(`Unsupported provider: ${cfg.provider as string}`);
  }
}

// ── OpenAI + OpenRouter (OpenAI-compatible /chat/completions) ───────────────
async function openaiCompatChat(
  cfg: ProviderConfig,
  opts: ChatOptions,
): Promise<ChatResult> {
  const base =
    cfg.provider === "openrouter"
      ? "https://openrouter.ai/api/v1"
      : "https://api.openai.com/v1";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${cfg.apiKey}`,
  };
  if (cfg.provider === "openrouter") {
    headers["HTTP-Referer"] = "https://growthpath.app";
    headers["X-Title"] = "GrowthPath";
  }

  const body: Record<string, unknown> = {
    model: cfg.model,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
  };
  if (opts.jsonObject !== false)
    body.response_format = { type: "json_object" };

  if (cfg.provider === "openai") {
    // Current OpenAI models (GPT-5.x / o-series) reject `max_tokens` (use
    // `max_completion_tokens`) and only allow the default temperature. Omit
    // temperature; older models like gpt-4o-mini accept this shape too.
    body.max_completion_tokens = opts.maxTokens;
  } else {
    // OpenRouter is OpenAI-compatible and normalizes `max_tokens` + temperature.
    body.max_tokens = opts.maxTokens;
    if (typeof opts.temperature === "number") body.temperature = opts.temperature;
  }

  const res = await postJSON(`${base}/chat/completions`, headers, body, cfg.provider);
  if (!res.ok) {
    throw new Error(`${cfg.provider} error ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string; reasoning?: string } }[];
    model?: string;
  };
  const msg = data.choices?.[0]?.message;
  return {
    text: msg?.content?.trim() || msg?.reasoning || "",
    modelUsed: data.model ?? cfg.model,
  };
}

// ── Anthropic Messages API ──────────────────────────────────────────────────
async function anthropicChat(
  cfg: ProviderConfig,
  opts: ChatOptions,
): Promise<ChatResult> {
  // Anthropic has no `response_format`; we rely on the JSON-only prompt + the
  // loose parser. `system` is a top-level field, not a message.
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": cfg.apiKey,
    "anthropic-version": "2023-06-01",
  };
  const body: Record<string, unknown> = {
    model: cfg.model,
    max_tokens: opts.maxTokens,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  };

  const res = await postJSON(
    "https://api.anthropic.com/v1/messages",
    headers,
    body,
    "anthropic",
  );
  if (!res.ok) {
    throw new Error(`anthropic error ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as {
    content?: { type?: string; text?: string }[];
    model?: string;
  };
  const text = (data.content ?? [])
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("")
    .trim();
  return { text, modelUsed: data.model ?? cfg.model };
}

// ── Google Gemini (generateContent) ─────────────────────────────────────────
async function googleChat(
  cfg: ProviderConfig,
  opts: ChatOptions,
): Promise<ChatResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    cfg.model,
  )}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`;

  const generationConfig: Record<string, unknown> = {
    maxOutputTokens: opts.maxTokens,
  };
  if (opts.jsonObject !== false)
    generationConfig.responseMimeType = "application/json";

  const body = {
    systemInstruction: { parts: [{ text: opts.system }] },
    contents: [{ role: "user", parts: [{ text: opts.user }] }],
    generationConfig,
  };

  const res = await postJSON(url, { "Content-Type": "application/json" }, body, "google");
  if (!res.ok) {
    throw new Error(`google error ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();
  return { text, modelUsed: cfg.model };
}

/**
 * Lightweight key validation for the settings "Test key" button: a tiny
 * generation that confirms the key + model work. Returns ok/error.
 */
export async function testProviderKey(
  cfg: ProviderConfig,
): Promise<{ ok: boolean; error?: string; modelUsed?: string }> {
  try {
    const { text, modelUsed } = await chatJSON(cfg, {
      system: 'Respond ONLY with the JSON {"ok":true}.',
      user: "ping",
      maxTokens: 32,
      temperature: 0,
    });
    const parsed = parseJsonLoose<{ ok?: boolean }>(text);
    if (parsed?.ok === true || text.length > 0) {
      return { ok: true, modelUsed };
    }
    return { ok: false, error: "Provider returned an empty response." };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
