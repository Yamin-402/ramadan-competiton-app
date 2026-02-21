import { z } from "zod";

const audienceEnum = z.enum(["SCHOOL", "UNIVERSITY"]);
const schoolSystemEnum = z.enum(["EGYPTIAN", "FOREIGN"]);

export const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  audience: audienceEnum.default("UNIVERSITY"),
  schoolSystem: schoolSystemEnum.optional(),
}).superRefine((payload, ctx) => {
  if (payload.audience === "SCHOOL" && !payload.schoolSystem) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["schoolSystem"],
      message: "School system is required when audience is SCHOOL",
    });
  }
});

export const createSessionSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});
