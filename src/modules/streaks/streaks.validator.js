import { z } from "zod";

export const evaluateStreakSchema = z.object({
  taskId: z.number().int().positive().optional(),
});

