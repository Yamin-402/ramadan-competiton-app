import { z } from "zod";

export const questionParamsSchema = z.object({
  questionId: z.coerce.number().int().positive(),
});

export const submitDailyAnswerSchema = z.object({
  answer: z.any(),
});

export const listMyHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
