import { z } from "zod";

export const listNotificationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const notificationParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});
