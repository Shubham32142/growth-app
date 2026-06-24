import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { userAiSettings } from "@/lib/db/schema";
import { decryptSecret } from "@/lib/crypto";
import { isAiProvider, type ProviderConfig } from "@/lib/ai-providers";

/**
 * Load a user's BYOK provider config (provider + decrypted key + model), or
 * null if they haven't set one up. Used by every AI call site and the cron.
 * `cache()`-wrapped so a single request dedupes the lookup.
 */
export const getUserProviderConfig = cache(
  async (userId: string): Promise<ProviderConfig | null> => {
    const [row] = await db
      .select()
      .from(userAiSettings)
      .where(eq(userAiSettings.userId, userId))
      .limit(1);

    if (!row || !isAiProvider(row.provider) || !row.model) return null;

    let apiKey: string;
    try {
      apiKey = decryptSecret(row.apiKeyEncrypted);
    } catch {
      // Key undecryptable (e.g. APP_ENCRYPTION_KEY rotated) — treat as unset
      // so the user is prompted to re-enter rather than hitting a 500.
      return null;
    }
    if (!apiKey) return null;

    return { provider: row.provider, apiKey, model: row.model };
  },
);

/** Standard error payload shape when a user has no AI key configured. */
export const NO_AI_CONFIG_ERROR =
  "No AI provider configured. Add your API key in Settings to generate plans.";
