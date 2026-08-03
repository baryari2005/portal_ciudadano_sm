import { z } from "zod";

export const generalSettingsSchema = z.object({
  pageSize: z.coerce.number().int().min(3).max(100),
  loginCollageImages: z.tuple([
    z.string().trim().url(), z.string().trim().url(),
    z.string().trim().url(), z.string().trim().url(),
  ]),
});
