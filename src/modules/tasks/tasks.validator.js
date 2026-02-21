import { z } from "zod";

export const listAvailableTasksQuerySchema = z.object({
  at: z.string().datetime().optional(),
});

export const taskParamsSchema = z.object({
  taskId: z.coerce.number().int().positive(),
});