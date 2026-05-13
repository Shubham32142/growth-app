import { z } from "zod";

/** PATCH /api/admin/settings */
export const updateSettingsBody = z.object({
  /** Empty string clears the DB override; non-empty replaces it. */
  model: z.string(),
});
export type UpdateSettingsBody = z.infer<typeof updateSettingsBody>;
