import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  jsonb,
  pgEnum,
  pgSchema,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * `auth.users` is managed by Supabase Auth. We declare it here only so we can
 * reference it via foreign keys. Do not write to it from app code.
 */
const authSchema = pgSchema("auth");
export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});

/* ────────────────────────────────────────────────────────────────────────── */
/* Enums                                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

export const taskCategoryEnum = pgEnum("task_category", [
  "technical",
  "personal-growth",
  "checkpoint",
]);

export const planStatusEnum = pgEnum("plan_status", [
  "generating", // LLM call in flight
  "active", // user is working through it
  "paused", // user explicitly paused
  "completed", // ran to end
  "archived", // user replaced with a new plan
]);

export const learningStyleEnum = pgEnum("learning_style", [
  "videos",
  "reading",
  "projects",
  "mixed",
]);

export const planSourceEnum = pgEnum("plan_source", [
  "ai-generated", // 5-question wizard → LLM
  "template", // curated markdown preset
]);

export const resourceTypeEnum = pgEnum("resource_type", [
  "article",
  "video",
  "doc",
  "exercise",
  "course",
]);

/* ────────────────────────────────────────────────────────────────────────── */
/* Profiles — 1:1 with auth.users                                              */
/* ────────────────────────────────────────────────────────────────────────── */

export const profiles = pgTable("profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  name: text("name"),
  image: text("image"),
  earlyAccess: boolean("early_access").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ────────────────────────────────────────────────────────────────────────── */
/* Plans — per-user, AI-generated (with template-imported escape hatch)        */
/* ────────────────────────────────────────────────────────────────────────── */

export const plans = pgTable(
  "plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),

    // Display
    title: text("title").notNull(),

    // Inputs the wizard collected (null when source = 'template')
    topic: text("topic"),
    goal: text("goal"),
    currentLevel: text("current_level"),
    hoursPerDay: integer("hours_per_day"),
    learningStyle: learningStyleEnum("learning_style"),

    // Duration the user picked at /plans/new (3 / 6 / 9 / custom months → weeks)
    durationWeeks: integer("duration_weeks").notNull(),

    source: planSourceEnum("source").notNull().default("ai-generated"),
    status: planStatusEnum("status").notNull().default("generating"),

    // When the user's "day 1" is. Used by streak + week calculations.
    startDate: timestamp("start_date", { withTimezone: true })
      .notNull()
      .defaultNow(),

    // Bumped when the WHOLE plan is regenerated (rare). Per-week regens bump
    // plan_weeks.generation_version, not this one.
    generationVersion: integer("generation_version").notNull().default(1),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // One active plan per user. Soft-enforced (status enum); a partial unique
    // index would be stricter but Postgres doesn't allow expression indexes
    // on enums cleanly across versions. We'll enforce in app code for v1.
    check(
      "plans_duration_weeks_range",
      sql`${t.durationWeeks} BETWEEN 1 AND 52`,
    ),
    check(
      "plans_hours_per_day_range",
      sql`${t.hoursPerDay} IS NULL OR ${t.hoursPerDay} BETWEEN 1 AND 12`,
    ),
  ],
);

/* ────────────────────────────────────────────────────────────────────────── */
/* Plan weeks — the LLM-generated outline                                      */
/*                                                                              */
/* Created up-front by the outline LLM call. tasks_generated_at is set when    */
/* the weekly task-generation LLM call has filled in this week's tasks.        */
/* ────────────────────────────────────────────────────────────────────────── */

export const planWeeks = pgTable(
  "plan_weeks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    weekNumber: integer("week_number").notNull(),
    monthNumber: integer("month_number").notNull(),

    // From the outline call
    theme: text("theme").notNull(),
    goal: text("goal").notNull(),

    // Null until weekly task-generation has run for this week
    tasksGeneratedAt: timestamp("tasks_generated_at", { withTimezone: true }),

    // Incremented when this week is regenerated. Tasks store the version they
    // came from so old/new can be distinguished if we ever keep history.
    generationVersion: integer("generation_version").notNull().default(1),

    // Free-text adjustment context the LLM saw last time it generated tasks
    // (e.g. "Last week: 60% completion, avg energy 2.8/5, struggled with X").
    // Useful for debugging plan quality + showing the user why difficulty changed.
    adjustmentNotes: text("adjustment_notes"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("plan_weeks_plan_week_unique").on(t.planId, t.weekNumber),
    check(
      "plan_weeks_week_number_range",
      sql`${t.weekNumber} BETWEEN 1 AND 52`,
    ),
    check(
      "plan_weeks_month_number_range",
      sql`${t.monthNumber} BETWEEN 1 AND 12`,
    ),
  ],
);

/* ────────────────────────────────────────────────────────────────────────── */
/* Tasks — generated per plan_week (in batches)                                */
/* ────────────────────────────────────────────────────────────────────────── */

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    planWeekId: uuid("plan_week_id")
      .notNull()
      .references(() => planWeeks.id, { onDelete: "cascade" }),

    weekNumber: integer("week_number").notNull(),
    monthNumber: integer("month_number").notNull(),
    section: text("section").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    category: taskCategoryEnum("category").notNull(),
    order: integer("order").notNull(),
    estimatedMinutes: integer("estimated_minutes").notNull().default(30),

    // Matches plan_weeks.generation_version at insert time. When a week is
    // regenerated we delete old task rows before inserting the new batch.
    generationVersion: integer("generation_version").notNull().default(1),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("tasks_plan_week_order_unique").on(t.planWeekId, t.order),
    check("tasks_week_number_range", sql`${t.weekNumber} BETWEEN 1 AND 52`),
    check("tasks_month_number_range", sql`${t.monthNumber} BETWEEN 1 AND 12`),
  ],
);

/* ────────────────────────────────────────────────────────────────────────── */
/* Completions — per-(user, task), idempotent                                  */
/* ────────────────────────────────────────────────────────────────────────── */

export const completions = pgTable(
  "completions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    weekNumber: integer("week_number").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    energyLevel: integer("energy_level"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("completions_user_task_unique").on(t.userId, t.taskId),
    uniqueIndex("completions_user_plan_week_idx").on(
      t.userId,
      t.planId,
      t.weekNumber,
      t.taskId,
    ),
    check(
      "completions_energy_level_range",
      sql`${t.energyLevel} IS NULL OR ${t.energyLevel} BETWEEN 1 AND 5`,
    ),
  ],
);

/* ────────────────────────────────────────────────────────────────────────── */
/* Energy logs                                                                 */
/* ────────────────────────────────────────────────────────────────────────── */

export const energyLogs = pgTable(
  "energy_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check("energy_logs_rating_range", sql`${t.rating} BETWEEN 1 AND 5`),
  ],
);

/* ────────────────────────────────────────────────────────────────────────── */
/* Resources — 3-tier (curated / search / community) per task                  */
/* ────────────────────────────────────────────────────────────────────────── */

export interface CuratedResource {
  title: string;
  url: string;
  type: "article" | "video" | "doc" | "exercise" | "course";
  summary: string;
  source:
    | "plan-resources-section"
    | "topic-map"
    | "tavily"
    | "brave"
    | "user"
    | "ai-generated";
}

export interface SearchResource {
  title: string;
  url: string;
  type: CuratedResource["type"];
  summary: string;
  snippet: string;
  fetchedAt: string; // ISO timestamp
  modelUsed: string;
  searchProvider: "tavily" | "brave";
}

export interface CommunityResource {
  submittedBy: string;
  title: string;
  url: string;
  votes: number;
  createdAt: string;
}

export const resources = pgTable("resources", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id")
    .notNull()
    .unique()
    .references(() => tasks.id, { onDelete: "cascade" }),
  curated: jsonb("curated")
    .$type<CuratedResource[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  search: jsonb("search")
    .$type<SearchResource[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  community: jsonb("community")
    .$type<CommunityResource[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  ttlDays: integer("ttl_days").notNull().default(30),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ────────────────────────────────────────────────────────────────────────── */
/* Wins — 3 entries per (user, week)                                           */
/* ────────────────────────────────────────────────────────────────────────── */

export const wins = pgTable(
  "wins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    weekNumber: integer("week_number").notNull(),
    entries: jsonb("entries").$type<[string, string, string]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("wins_user_plan_week_unique").on(
      t.userId,
      t.planId,
      t.weekNumber,
    ),
    check("wins_week_number_range", sql`${t.weekNumber} BETWEEN 1 AND 52`),
    check("wins_entries_shape", sql`jsonb_array_length(${t.entries}) = 3`),
  ],
);

/* ────────────────────────────────────────────────────────────────────────── */
/* Recaps                                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

export const recaps = pgTable(
  "recaps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    weekNumber: integer("week_number").notNull(),
    content: text("content").notNull(),
    achievements: jsonb("achievements")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    growthAreas: jsonb("growth_areas")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    improvements: jsonb("improvements")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    modelUsed: text("model_used").notNull(),
    shareToken: text("share_token").unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("recaps_user_plan_week_unique").on(
      t.userId,
      t.planId,
      t.weekNumber,
    ),
    check("recaps_week_number_range", sql`${t.weekNumber} BETWEEN 1 AND 52`),
  ],
);

/* ────────────────────────────────────────────────────────────────────────── */
/* Settings — global key/value                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedBy: uuid("updated_by").references(() => authUsers.id, {
    onDelete: "set null",
  }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Per-user BYOK AI provider config. One active config per user: the provider
 * they chose, their API key (AES-256-GCM encrypted — see lib/crypto.ts), and
 * the model id. The plaintext key is never stored or returned to the browser.
 */
export const userAiSettings = pgTable("user_ai_settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(), // 'openai' | 'anthropic' | 'google' | 'openrouter'
  apiKeyEncrypted: text("api_key_encrypted").notNull(),
  model: text("model").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ────────────────────────────────────────────────────────────────────────── */
/* Rate limit hits — sliding-window log used by lib/ratelimit.ts              */
/*                                                                              */
/* No RLS (server-side / service-role only). Rows are insert-only and          */
/* purged by the rate limiter on each check.                                    */
/* ────────────────────────────────────────────────────────────────────────── */

export const rateLimitHits = pgTable("rate_limit_hits", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull(),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});

/* ────────────────────────────────────────────────────────────────────────── */
/* Inferred types                                                              */
/* ────────────────────────────────────────────────────────────────────────── */

export type Profile = typeof profiles.$inferSelect;
export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;
export type PlanWeek = typeof planWeeks.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Completion = typeof completions.$inferSelect;
export type EnergyLog = typeof energyLogs.$inferSelect;
export type Resource = typeof resources.$inferSelect;
export type Win = typeof wins.$inferSelect;
export type Recap = typeof recaps.$inferSelect;
export type Setting = typeof settings.$inferSelect;
