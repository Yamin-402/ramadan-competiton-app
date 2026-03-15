import { getAuthUserId } from "../../core/utils/get-auth-user-id.js";
import { competitionService } from "./competition.service.js";

export async function getCompetitionState(req, res) {
  const userId = getAuthUserId(req.auth);
  const data = await competitionService.getStateForUser(userId);
  res.status(200).json({ data });
}
