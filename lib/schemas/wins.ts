import { z } from "zod";

const winEntry = z.string().trim().min(1, "Win cannot be empty");

/** POST /api/wins */
export const saveWinsBody = z.object({
  entries: z.tuple([winEntry, winEntry, winEntry]),
  weekNumber: z.number().int().min(1).max(52).optional(),
});
export type SaveWinsBody = z.infer<typeof saveWinsBody>;
