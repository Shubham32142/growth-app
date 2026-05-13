import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Lazy server-side Drizzle client.
 *
 * Why lazy: at build time Next.js evaluates every route module to collect
 * metadata. If we instantiate the Postgres connection at module load and
 * the DATABASE_URL isn't set (or contains literal `<placeholder>` chars in
 * `.env.local`), postgres.js throws synchronously and the build fails. By
 * deferring construction to first property access we let routes compile
 * even before the user has wired their Supabase creds.
 *
 * The pooler URL also needs `prepare: false` because the Supabase
 * transaction pooler (port 6543) does not support prepared statements
 * across pooled connections.
 */
type DrizzleClient = ReturnType<typeof drizzle<typeof schema>>;
type GlobalWithDb = typeof globalThis & {
  __growthpathPgClient?: ReturnType<typeof postgres>;
  __growthpathDrizzle?: DrizzleClient;
};

function buildClient(): DrizzleClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env.local (see .env.local.example).",
    );
  }
  const g = globalThis as GlobalWithDb;
  if (!g.__growthpathPgClient) {
    g.__growthpathPgClient = postgres(url, { prepare: false });
  }
  if (!g.__growthpathDrizzle) {
    g.__growthpathDrizzle = drizzle(g.__growthpathPgClient, { schema });
  }
  return g.__growthpathDrizzle;
}

export const db = new Proxy({} as DrizzleClient, {
  get(_target, prop) {
    const client = buildClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export { schema };
