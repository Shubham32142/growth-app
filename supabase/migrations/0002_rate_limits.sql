-- Sliding-window rate limit log. Server-side / service-role only — RLS
-- intentionally disabled (no auth.uid() check needed).

CREATE TABLE "rate_limit_hits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" text NOT NULL,
  "at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "rate_limit_hits_key_at_idx"
  ON "rate_limit_hits" USING btree ("key", "at" DESC);
