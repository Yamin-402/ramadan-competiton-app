import { prisma } from "../../core/db/prisma.js";

export const leaderboardRepository = {
  async getPointTotals({ skip, take }) {
    const [users, grouped] = await Promise.all([
      prisma.user.findMany({
        where: {
          isActive: true,
          role: "USER",
          isLeaderboardVisible: true,
        },
        select: {
          id: true,
          displayName: true,
          email: true,
          avatarUrl: true,
          isStreakPublic: true,
        },
      }),
      prisma.activity.groupBy({
        by: ["userId"],
        _sum: {
          effectivePoints: true,
        },
      }),
    ]);

    if (users.length === 0) {
      return {
        rows: [],
        hasNextPage: false,
      };
    }

    const totalsByUserId = new Map(
      grouped.map((row) => [row.userId, Number(row._sum.effectivePoints || 0)])
    );

    const sorted = users
      .map((user) => ({
        user,
        totalPoints: totalsByUserId.get(user.id) || 0,
      }))
      .sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) {
          return b.totalPoints - a.totalPoints;
        }
        return a.user.id - b.user.id;
      });

    const withSentinel = sorted.slice(skip, skip + take + 1);
    const hasNextPage = withSentinel.length > take;
    const pagedRows = hasNextPage ? withSentinel.slice(0, take) : withSentinel;

    return {
      hasNextPage,
      rows: pagedRows.map((row) => ({
        user: row.user,
        totalPoints: row.totalPoints,
      })),
    };
  },
};
