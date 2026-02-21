import { z } from "zod";

export const listTagsQuerySchema = z.object({
  includeInactive: z.coerce.boolean().default(false),
});