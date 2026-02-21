import { prisma } from "../../core/db/prisma.js";

const taskInclude = {
  tagRequirements: {
    select: {
      tagId: true,
    },
  },
  dependencies: true,
  conditions: true,
  counterRules: true,
};

export const tasksRepository = {
  async findUserTagIds(userId) {
    const rows = await prisma.userTag.findMany({
      where: { userId },
      select: { tagId: true },
    });

    return rows.map((row) => row.tagId);
  },

  findActiveTasks(referenceAt) {
    return prisma.task.findMany({
      where: {
        status: "ACTIVE",
        AND: [
          {
            OR: [{ startsAt: null }, { startsAt: { lte: referenceAt } }],
          },
          {
            OR: [{ endsAt: null }, { endsAt: { gte: referenceAt } }],
          },
        ],
      },
      include: taskInclude,
      orderBy: [{ type: "asc" }, { createdAt: "desc" }],
    });
  },

  findTaskById(taskId) {
    return prisma.task.findUnique({
      where: { id: taskId },
      include: taskInclude,
    });
  },
};