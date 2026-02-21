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
