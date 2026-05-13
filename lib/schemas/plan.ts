import { z } from "zod";

/** POST /api/plans/create */
export const createPlanBody = z.object({
  topic: z.string().trim().min(3, "Topic must be at least 3 characters"),
  goal: z.string().trim().min(3, "Goal must be at least 3 characters"),
  currentLevel: z.string().trim().min(1, "Current level is required"),
  hoursPerDay: z
    .number()
    .int("hoursPerDay must be a whole number")
    .min(1)
    .max(12),
  learningStyle: z.enum(["videos", "reading", "projects", "mixed"]),
  durationWeeks: z
    .number()
    .int("durationWeeks must be a whole number")
    .min(4)
    .max(52),
});
export type CreatePlanBody = z.infer<typeof createPlanBody>;
