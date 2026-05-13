import type { Config } from "drizzle-kit";

// Prefer the direct connection for migrations (port 5432, full DDL support).
// Fall back to DATABASE_URL so existing setups still work.
const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error(
    "Set DIRECT_URL (preferred) or DATABASE_URL in .env.local — see .env.local.example.",
  );
}

export default {
  schema: "./lib/db/schema.ts",
  out: "./supabase/migrations",
  dialect: "postgresql",
  dbCredentials: { url: dbUrl },
  schemaFilter: ["public"],
  verbose: true,
  strict: true,
} satisfies Config;
