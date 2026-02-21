import { leaderboardRepository } from "./leaderboard.repository.js";

export const leaderboardService = {
  async getLeaderboardProjection(query) {
    const page = query.page;
    const pageSize = query.pageSize;
    const skip = (page - 1) * pageSize;

    const { rows, hasNextPage } = await leaderboardRepository.getPointTotals({
      skip,
      take: pageSize,
    });

    const items = rows.map((row, index) => ({
      rank: skip + index + 1,
      user: row.user,
      totalPoints: row.totalPoints,
      publicScore: Math.max(0, row.totalPoints),
    }));

    return {
      items,
      pagination: {
        page,
        pageSize,
        hasNextPage,
        hasPreviousPage: page > 1,
      },
    };
  },
};
