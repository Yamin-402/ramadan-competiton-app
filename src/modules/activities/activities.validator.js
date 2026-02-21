import { z } from "zod";

export const createTaskCompletionSchema = z.object({
  taskId: z.number().int().positive(),
  occurredAt: z.string().datetime().optional(),
  amount: z.number().optional(),
  note: z.string().max(500).optional(),
  isDuringFasting: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
});

export const listMyActivitiesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(20),
});

export const fastingStatusQuerySchema = z.object({
  occurredAt: z.string().datetime().optional(),
});

export const todayTaskStatusQuerySchema = z.object({
  occurredAt: z.string().datetime().optional(),
});
