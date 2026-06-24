-- ─────────────────────────────────────────────────────────────────────────────
-- GrowthPath BYOK — per-user AI provider settings
--
-- One active config per user: provider + AES-256-GCM-encrypted API key + model.
-- RLS pins read/write to the owner; the app also enforces ownership in code.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "user_ai_settings" (
  "user_id" uuid PRIMARY KEY REFERENCES "auth"."users"("id") ON DELETE CASCADE,
  "provider" text NOT NULL,
  "api_key_encrypted" text NOT NULL,
  "model" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "user_ai_settings_provider_check"
    CHECK ("provider" IN ('openai', 'anthropic', 'google', 'openrouter'))
);

ALTER TABLE "user_ai_settings" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_ai_settings_self_select" ON "user_ai_settings"
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_ai_settings_self_insert" ON "user_ai_settings"
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_ai_settings_self_update" ON "user_ai_settings"
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_ai_settings_self_delete" ON "user_ai_settings"
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
