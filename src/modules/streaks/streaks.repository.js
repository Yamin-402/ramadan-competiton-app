import { prisma } from "../../core/db/prisma.js";
import { isStreakEnabledTask } from "./streaks.utils.js";

const streakInclude = {
  task: {
    select: {
      id: true,
      key: true,
      title: true,
      type: true,
      status: true,
      config: true,
    },
  },
};

export const streaksRepository = {
  async findStreakTaskById(taskId) {
    const task = await prisma.task.findUnique({
      where: {
        id: taskId,
      },
      select: {
        id: true,
        key: true,
        title: true,
        type: true,
        status: true,
        config: true,
      },
    });

    if (!isStreakEnabledTask(task)) {
      return null;
    }

    return task;
  },

  findStreakByUserAndTask(userId, taskId) {
    return prisma.streak.findUnique({
      where: {
        userId_taskId: {
          userId,
          taskId,
        },
      },
      include: streakInclude,
    });
  },

  listActivityDatesForTask(userId, taskId) {
    return prisma.activity.findMany({
      where: {
        userId,
        taskId,
        type: "TASK_COMPLETION",
      },
      select: {
        occurredAt: true,
      },
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    });
  },

  async listEvaluableStreakTaskIds(userId) {
    const [taskIdsFromActivities, taskIdsFromCache] = await Promise.all([
      prisma.activity.findMany({
        where: {
          userId,
          type: "TASK_COMPLETION",
          taskId: {
            not: null,
          },
        },
        distinct: ["taskId"],
        select: {
          taskId: true,
        },
      }),
      prisma.streak.findMany({
        where: {
          userId,
        },
        select: {
          taskId: true,
        },
      }),
    ]);

    const taskIdSet = new Set();

    for (const row of taskIdsFromActivities) {
      if (row.taskId) {
        taskIdSet.add(row.taskId);
      }
    }

    for (const row of taskIdsFromCache) {
      taskIdSet.add(row.taskId);
    }

    const allTaskIds = Array.from(taskIdSet.values());
    if (allTaskIds.length === 0) {
      return [];
    }

    const tasks = await prisma.task.findMany({
      where: {
        id: {
          in: allTaskIds,
        },
      },
      select: {
        id: true,
        type: true,
        config: true,
      },
    });

    return tasks.filter((task) => isStreakEnabledTask(task)).map((task) => task.id);
  },

  upsertStreak(payload) {
    return prisma.streak.upsert({
      where: {
        userId_taskId: {
          userId: payload.userId,
          taskId: payload.taskId,
        },
      },
      update: {
        currentStreak: payload.currentStreak,
        longestStreak: payload.longestStreak,
        graceDaysUsed: payload.graceDaysUsed,
        rewardMultiplier: payload.rewardMultiplier,
        lastActivityDate: payload.lastActivityDate,
        lastEvaluatedAt: payload.lastEvaluatedAt,
      },
      create: {
        userId: payload.userId,
        taskId: payload.taskId,
        currentStreak: payload.currentStreak,
        longestStreak: payload.longestStreak,
        graceDaysUsed: payload.graceDaysUsed,
        rewardMultiplier: payload.rewardMultiplier,
        lastActivityDate: payload.lastActivityDate,
        lastEvaluatedAt: payload.lastEvaluatedAt,
      },
      include: streakInclude,
    });
  },

  listMyStreaks(userId) {
    return prisma.streak.findMany({
      where: {
        userId,
      },
      include: streakInclude,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    });
  },
};
