import { registerSchema, createSessionSchema } from "./auth.validator.js";
import { authService } from "./auth.service.js";

export async function register(req, res) {
  const payload = registerSchema.parse(req.body);
  const data = await authService.register(payload);

  res.status(201).json({ data });
}

export async function createSession(req, res) {
  const payload = createSessionSchema.parse(req.body);
  const data = await authService.createSession(payload);

  res.status(200).json({ data });
}