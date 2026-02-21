import { z } from "zod";

export const registerDeviceSchema = z.object({
  pushToken: z.string().min(10),
  platform: z.enum(["IOS", "ANDROID"]),
});

