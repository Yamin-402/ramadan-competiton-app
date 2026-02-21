import { prisma } from "../../core/db/prisma.js";

export const countersRepository = {
  async getUserCounterTotals(userId) {
    const grouped = await prisma.activityCounterDelta.groupBy({
      by: ["counterId"],
      where: {
        activity: {
          userId,
        },
      },
      _sum: {
        delta: true,
      },
    });

    if (grouped.length === 0) {
      return [];
    }

    const counterIds = grouped.map((row) => row.counterId);
    const counters = await prisma.counterDefinition.findMany({
      where: {
        id: { in: counterIds },
      },
    });

    const counterById = new Map(counters.map((counter) => [counter.id, counter]));

    return grouped
      .map((row) => {
        const counter = counterById.get(row.counterId);
        if (!counter) {
          return null;
        }

        return {
          counter,
          total: Number(row._sum.delta || 0),
        };
      })
      .filter(Boolean);
  },
};