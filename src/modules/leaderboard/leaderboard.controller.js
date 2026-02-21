import { leaderboardQuerySchema } from "./leaderboard.validator.js";
import { leaderboardService } from "./leaderboard.service.js";

export async function getLeaderboard(req, res) {
  const query = leaderboardQuerySchema.parse(req.query);
  const { items, pagination } = await leaderboardService.getLeaderboardProjection(query);

  res.status(200).json({
    data: items,
    meta: pagination,
  });
}
