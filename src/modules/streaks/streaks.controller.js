import { evaluateStreakSchema } from "./streaks.validator.js";
import { streaksService } from "./streaks.service.js";

export async function evaluateMyStreaks(req, res) {
  const payload = evaluateStreakSchema.parse(req.body ?? {});
  const data = await streaksService.evaluateMyStreaks(req.auth, payload);

  res.status(200).json({ data });
}

export async function getMyStreaks(req, res) {
  const data = await streaksService.getMyStreaks(req.auth);
  res.status(200).json({ data });
}

