import { z } from "zod";

export const updateMyTagsSchema = z.object({
  tagKeys: z.array(z.string().min(1)).default([]),
});

export const updateMyProfileSchema = z.object({
  displayName: z.string().min(1).max(120).nullable().optional(),
  bio: z.string().max(500).nullable().optional(),
  avatarUrl: z.string().max(800000).nullable().optional(),
  isStreakPublic: z.boolean().optional(),
});

export const publicProfileParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const generateMyAiReportSchema = z.object({
  lookbackDays: z.coerce.number().int().min(3).max(60).default(14),
  reportLength: z.enum(["SHORT", "MEDIUM", "LONG"]).default("MEDIUM"),
  focusMode: z.enum(["SUMMARY", "COMPARISON", "BOTH"]).default("BOTH"),
  language: z.enum(["AR", "EN"]).default("AR"),
  tone: z.enum(["MOTIVATIONAL", "BALANCED", "STRICT"]).default("MOTIVATIONAL"),
  includeDailyQuestions: z.boolean().default(true),
  includeTiming: z.boolean().default(true),
  includeTopTasks: z.boolean().default(true),
  includeStreaks: z.boolean().default(true),
});
