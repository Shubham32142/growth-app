/**
 * Idempotent migration runner.
 *
 *   bun run db:apply
 *
 * - Maintains a `_migrations` table tracking applied filenames.
 * - On first run against a pre-existing DB (schema already there but no
 *   `_migrations` table), it detects what's been done from the existence
 *   of key tables and back-fills `_migrations` so we don't re-apply.
 * - Each migration runs inside a transaction; failure rolls back and
 *   the script aborts. Re-run after fixing.
 * - Uses DIRECT_URL (preferred) or DATABASE_URL.
 */
import postgres from "postgres";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error(
    "Set DIRECT_URL (preferred) or DATABASE_URL in .env.local before running migrations.",
  );
  process.exit(1);
}

let sql: ReturnType<typeof postgres>;
try {
  sql = postgres(dbUrl, { prepare: false, max: 1 });
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  if (/URI/i.test(msg)) {
    console.error(
      "\n✗ Your DATABASE_URL / DIRECT_URL contains an invalid URL escape.",
    );
    console.error(
      "  Encode your password and paste the encoded version:\n" +
        `    node -e "console.log(encodeURIComponent('YOUR_RAW_PASSWORD'))"\n`,
    );
  } else {
    console.error("Failed to construct Postgres client:", msg);
  }
  process.exit(1);
}

async function ensureMigrationsTable() {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS _migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function bootstrap() {
  // If we already have a populated _migrations table, nothing to do.
  const countRows = await sql<
    { count: number }[]
  >`SELECT count(*)::int as count FROM _migrations`;
  if ((countRows[0]?.count ?? 0) > 0) return;

  // Best-effort: detect which migrations have already run based on table
  // + policy presence. This handles the common case where the user ran
  // db:apply once against an empty DB before we added the tracker.
  const tableRows = await sql<{ table_name: string }[]>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
  `;
  const have = new Set(tableRows.map((r) => r.table_name));

  const detected: string[] = [];

  // 0000_initial.sql produces the core schema. If `plans` and `plan_weeks`
  // are both there, treat 0000 as applied.
  if (have.has("plans") && have.has("plan_weeks") && have.has("tasks")) {
    detected.push("0000_initial.sql");
  }

  // 0001_rls_policies.sql enables RLS on `plans` (among others). Check the
  // pg_class flag for that table specifically.
  const rls = await sql<{ rls: boolean }[]>`
    SELECT relrowsecurity as rls FROM pg_class WHERE relname = 'plans'
  `;
  if (rls[0]?.rls) {
    detected.push("0001_rls_policies.sql");
  }

  // 0002 (and beyond) — we add a check per migration as they land.
  if (have.has("rate_limit_hits")) {
    detected.push("0002_rate_limits.sql");
  }

  if (detected.length === 0) return;

  console.log(
    `Detected pre-existing schema. Back-filling _migrations with: ${detected.join(", ")}`,
  );
  for (const f of detected) {
    await sql`INSERT INTO _migrations (filename) VALUES (${f}) ON CONFLICT DO NOTHING`;
  }
}

async function main() {
  await ensureMigrationsTable();
  await bootstrap();

  const dir = join(process.cwd(), "supabase", "migrations");
  const files = (await readdir(dir))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("No migration files found.");
    return;
  }

  const appliedRows = await sql<
    { filename: string }[]
  >`SELECT filename FROM _migrations`;
  const applied = new Set(appliedRows.map((r) => r.filename));

  let appliedCount = 0;
  let skippedCount = 0;

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`▶ ${file} — skipped (already applied)`);
      skippedCount++;
      continue;
    }

    const contents = await readFile(join(dir, file), "utf8");
    // Drizzle uses `--> statement-breakpoint` to delimit statements.
    const statements = contents
      .split(/-->\s*statement-breakpoint/g)
      .map((s) => s.trim())
      .filter(
        (s) =>
          s.length > 0 && !s.split("\n").every((l) => l.trim().startsWith("--")),
      );

    process.stdout.write(`▶ Applying ${file}… `);
    try {
      await sql.begin(async (tx) => {
        for (const stmt of statements) {
          await tx.unsafe(stmt);
        }
        await tx`INSERT INTO _migrations (filename) VALUES (${file})`;
      });
      console.log("✓");
      appliedCount++;
    } catch (err) {
      console.log("✗");
      console.error(err);
      process.exit(1);
    }
  }

  console.log(
    `\nDone. ${appliedCount} applied, ${skippedCount} already-applied.`,
  );
}

main()
  .then(() => sql.end({ timeout: 5 }))
  .catch((err) => {
    console.error(err);
    sql.end({ timeout: 5 });
    process.exit(1);
  });
