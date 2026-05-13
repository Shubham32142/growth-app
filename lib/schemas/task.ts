import { z } from "zod";

/** POST /api/tasks/[id]/complete */
export const completeTaskBody = z.object({
  energyLevel: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]).optional(),
  /** ISO YYYY-MM-DD for back-filling a past day. */
  at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "`at` must be YYYY-MM-DD")
    .optional(),
});
export type CompleteTaskBody = z.infer<typeof completeTaskBody>;
