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

export const activitiesRepository = {
  findTaskById(taskId) {
    return prisma.task.findUnique({
      where: { id: taskId },
      include: taskInclude,
    });
  },

  async findUserTagIds(userId) {
    const rows = await prisma.userTag.findMany({
      where: { userId },
      select: { tagId: true },
    });

    return rows.map((row) => row.tagId);
  },

  countTaskCompletions({ userId, taskId, since }) {
    const where = {
      userId,
      type: "TASK_COMPLETION",
      taskId,
      ...(since ? { occurredAt: { gte: since } } : {}),
    };

    return prisma.activity.count({ where });
  },

  countTaskCompletionsInWindow({ userId, taskId, startAt, endAt }) {
    return prisma.activity.count({
      where: {
        userId,
        taskId,
        type: "TASK_COMPLETION",
        occurredAt: {
          gte: startAt,
          lt: endAt,
        },
      },
    });
  },

  async listTaskCompletionCountsInWindow({ userId, startAt, endAt }) {
    const rows = await prisma.activity.groupBy({
      by: ["taskId"],
      where: {
        userId,
        type: "TASK_COMPLETION",
        taskId: { not: null },
        occurredAt: {
          gte: startAt,
          lt: endAt,
        },
      },
      _count: {
        _all: true,
      },
    });

    return rows
      .filter((row) => typeof row.taskId === "number")
      .map((row) => ({
        taskId: row.taskId,
        count: row._count._all,
      }));
  },

  listConditionalTasksByChildTaskId(childTaskId) {
    return prisma.task.findMany({
      where: {
        status: "ACTIVE",
        type: "CONDITIONAL",
      },
      include: taskInclude,
    }).then((rows) =>
      rows.filter((row) => {
        const config = row.config;
        if (!config || typeof config !== "object" || Array.isArray(config)) {
          return false;
        }

        const childIds = Array.isArray(config.conditionalChildTaskIds)
          ? config.conditionalChildTaskIds
              .map((value) => Number(value))
              .filter((value) => Number.isInteger(value) && value > 0)
          : [];

        return childIds.includes(childTaskId);
      })
    );
  },

  async listDistinctCompletedTaskIdsInWindow({ userId, taskIds, startAt, endAt }) {
    const rows = await prisma.activity.findMany({
      where: {
        userId,
        type: "TASK_COMPLETION",
        taskId: { in: taskIds },
        occurredAt: {
          gte: startAt,
          lt: endAt,
        },
      },
      select: {
        taskId: true,
      },
      distinct: ["taskId"],
    });

    return rows
      .map((row) => row.taskId)
      .filter((taskId) => typeof taskId === "number");
  },

  findSystemActivityByNote({ userId, taskId, note }) {
    return prisma.activity.findFirst({
      where: {
        userId,
        taskId,
        type: "SYSTEM",
        note,
      },
      select: {
        id: true,
      },
    });
  },

  async sumSystemActivityPointsByNotePrefix({ userId, taskId, notePrefix }) {
    const result = await prisma.activity.aggregate({
      where: {
        userId,
        taskId,
        type: "SYSTEM",
        note: {
          startsWith: notePrefix,
        },
      },
      _sum: {
        effectivePoints: true,
      },
    });

    return Number(result._sum.effectivePoints || 0);
  },

  createSystemActivity(payload) {
    return prisma.activity.create({
      data: {
        userId: payload.userId,
        taskId: payload.taskId,
        type: "SYSTEM",
        occurredAt: payload.occurredAt,
        timezone: payload.timezone,
        isDuringFasting: payload.isDuringFasting,
        fastingMultiplier: payload.fastingMultiplier,
        basePoints: payload.basePoints,
        effectivePoints: payload.effectivePoints,
        note: payload.note,
        metadata: payload.metadata,
        isForbidden: false,
      },
    });
  },

  async sumCounterTotal({ userId, counterId }) {
    const result = await prisma.activityCounterDelta.aggregate({
      where: {
        counterId,
        activity: {
          userId,
        },
      },
      _sum: {
        delta: true,
      },
    });

    return Number(result._sum.delta || 0);
  },

  createTaskCompletion(payload) {
    return prisma.activity.create({
      data: {
        userId: payload.userId,
        taskId: payload.taskId,
        type: "TASK_COMPLETION",
        occurredAt: payload.occurredAt,
        timezone: payload.timezone,
        isDuringFasting: payload.isDuringFasting,
        fastingMultiplier: payload.fastingMultiplier,
        basePoints: payload.basePoints,
        effectivePoints: payload.effectivePoints,
        note: payload.note,
        metadata: payload.metadata,
        isForbidden: payload.isForbidden,
        counterDeltas:
          payload.counterDeltas.length > 0
            ? {
                create: payload.counterDeltas.map((delta) => ({
                  counterId: delta.counterId,
                  delta: delta.delta,
                })),
              }
            : undefined,
      },
      include: {
        task: {
          select: {
            id: true,
            key: true,
            title: true,
            type: true,
            config: true,
          },
        },
        counterDeltas: {
          include: {
            counter: {
              select: {
                id: true,
                key: true,
                name: true,
                unit: true,
              },
            },
          },
        },
      },
    });
  },

  listUserActivities(userId, limit) {
    return prisma.activity.findMany({
      where: { userId },
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      take: limit,
      include: {
        task: {
          select: {
            id: true,
            key: true,
            title: true,
            type: true,
            config: true,
          },
        },
        counterDeltas: {
          include: {
            counter: {
              select: {
                id: true,
                key: true,
                name: true,
                unit: true,
              },
            },
          },
        },
      },
    });
  },
};
