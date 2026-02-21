import { z } from "zod";

export const createCommitmentSchema = z.object({
  taskId: z.number().int().positive(),
  triggerType: z.enum(["MISS_TASK", "COMPLETE_TASK", "DO_FORBIDDEN", "AVOID_FORBIDDEN"]),
  amount: z.number(),
  active: z.boolean().optional(),
});

export const createFriendlyCommitmentSchema = z.object({
  taskId: z.number().int().positive(),
  when: z.enum(["COMPLETED", "NOT_COMPLETED"]),
  amount: z.number(),
  active: z.boolean().optional(),
});

export const listCommitmentsQuerySchema = z.object({
  active: z.coerce.boolean().optional(),
});

export const evaluateTodaySchema = z.object({});

export const summaryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const moneyEntryParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const removeEntrySchema = z.object({
  removedReason: z.string().max(500).optional(),
});
