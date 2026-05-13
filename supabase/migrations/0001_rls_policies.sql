-- ─────────────────────────────────────────────────────────────────────────────
-- GrowthPath Row-Level Security (RLS) policies — AI-plan schema
--
-- Runs after 0000_initial.sql.
--
-- Plans are now PER-USER (no public templates). Every user-owned table
-- pins read/write to `auth.uid() = user_id`. Tasks + plan_weeks + resources
-- inherit ownership via `plans.user_id`, so their policies join through
-- plans rather than carrying their own user_id column.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── profiles ──────────────────────────────────────────────────────────────
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_self_select" ON "profiles"
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "profiles_self_insert" ON "profiles"
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_self_update" ON "profiles"
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-create a profile row when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ── plans ─────────────────────────────────────────────────────────────────
ALTER TABLE "plans" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_self_select" ON "plans"
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "plans_self_insert" ON "plans"
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "plans_self_update" ON "plans"
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "plans_self_delete" ON "plans"
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);


-- ── plan_weeks ────────────────────────────────────────────────────────────
ALTER TABLE "plan_weeks" ENABLE ROW LEVEL SECURITY;

-- Ownership is inherited from the parent plan row.
CREATE POLICY "plan_weeks_via_plan_select" ON "plan_weeks"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "plans" p
      WHERE p.id = "plan_weeks".plan_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "plan_weeks_via_plan_insert" ON "plan_weeks"
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "plans" p
      WHERE p.id = "plan_weeks".plan_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "plan_weeks_via_plan_update" ON "plan_weeks"
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "plans" p
      WHERE p.id = "plan_weeks".plan_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "plans" p
      WHERE p.id = "plan_weeks".plan_id AND p.user_id = auth.uid()
    )
  );


-- ── tasks ─────────────────────────────────────────────────────────────────
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_via_plan_select" ON "tasks"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "plans" p
      WHERE p.id = "tasks".plan_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "tasks_via_plan_insert" ON "tasks"
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "plans" p
      WHERE p.id = "tasks".plan_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "tasks_via_plan_update" ON "tasks"
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "plans" p
      WHERE p.id = "tasks".plan_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "plans" p
      WHERE p.id = "tasks".plan_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "tasks_via_plan_delete" ON "tasks"
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "plans" p
      WHERE p.id = "tasks".plan_id AND p.user_id = auth.uid()
    )
  );


-- ── resources ─────────────────────────────────────────────────────────────
ALTER TABLE "resources" ENABLE ROW LEVEL SECURITY;

-- A resource row is readable/writable iff the task's plan belongs to the user.
CREATE POLICY "resources_via_task_select" ON "resources"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "tasks" t
      JOIN "plans" p ON p.id = t.plan_id
      WHERE t.id = "resources".task_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "resources_via_task_insert" ON "resources"
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "tasks" t
      JOIN "plans" p ON p.id = t.plan_id
      WHERE t.id = "resources".task_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "resources_via_task_update" ON "resources"
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "tasks" t
      JOIN "plans" p ON p.id = t.plan_id
      WHERE t.id = "resources".task_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "tasks" t
      JOIN "plans" p ON p.id = t.plan_id
      WHERE t.id = "resources".task_id AND p.user_id = auth.uid()
    )
  );


-- ── completions ───────────────────────────────────────────────────────────
ALTER TABLE "completions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "completions_self_select" ON "completions"
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "completions_self_insert" ON "completions"
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "completions_self_update" ON "completions"
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "completions_self_delete" ON "completions"
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);


-- ── energy_logs ───────────────────────────────────────────────────────────
ALTER TABLE "energy_logs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "energy_logs_self_select" ON "energy_logs"
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "energy_logs_self_insert" ON "energy_logs"
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "energy_logs_self_delete" ON "energy_logs"
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);


-- ── wins ──────────────────────────────────────────────────────────────────
ALTER TABLE "wins" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wins_self_select" ON "wins"
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "wins_self_insert" ON "wins"
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "wins_self_update" ON "wins"
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "wins_self_delete" ON "wins"
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);


-- ── recaps ────────────────────────────────────────────────────────────────
ALTER TABLE "recaps" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recaps_self_select" ON "recaps"
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Anyone (including anon) can read a recap by its share_token. Token is
-- only present on the row when the owner created a share link.
CREATE POLICY "recaps_public_share" ON "recaps"
  FOR SELECT TO anon, authenticated
  USING (share_token IS NOT NULL);

CREATE POLICY "recaps_self_insert" ON "recaps"
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "recaps_self_update" ON "recaps"
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "recaps_self_delete" ON "recaps"
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);


-- ── settings ──────────────────────────────────────────────────────────────
ALTER TABLE "settings" ENABLE ROW LEVEL SECURITY;

-- Global settings (e.g. openrouter.model). Read by any authenticated user;
-- writes only via service-role key (admin scripts).
CREATE POLICY "settings_read_all" ON "settings"
  FOR SELECT TO authenticated
  USING (true);
