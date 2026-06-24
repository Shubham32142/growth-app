import { z } from "zod";

/** Shared provider enum — mirrors AI_PROVIDERS in lib/ai-providers.ts. */
export const aiProviderEnum = z.enum([
  "openai",
  "anthropic",
  "google",
  "openrouter",
]);

/**
 * PATCH /api/account/ai-settings — save the user's provider config.
 * `apiKey` is optional on update: when omitted, the existing stored key is kept
 * (so users can change just the model without re-pasting the key).
 */
export const saveAiSettingsBody = z.object({
  provider: aiProviderEnum,
  model: z.string().trim().min(1, "Model is required").max(200),
  apiKey: z.string().trim().min(8, "API key looks too short").max(512).optional(),
});
export type SaveAiSettingsBody = z.infer<typeof saveAiSettingsBody>;

/** POST /api/account/ai-settings?action=test — validate a key before saving. */
export const testAiSettingsBody = z.object({
  provider: aiProviderEnum,
  model: z.string().trim().min(1).max(200),
  apiKey: z.string().trim().min(8).max(512),
});
export type TestAiSettingsBody = z.infer<typeof testAiSettingsBody>;
