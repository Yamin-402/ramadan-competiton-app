import { prisma } from "../../core/db/prisma.js";

const commitmentInclude = {
  task: {
    select: {
      id: true,
      key: true,
      title: true,
      type: true,
      status: true,
    },
  },
};

const entryInclude = {
  task: {
    select: {
      id: true,
      key: true,
      title: true,
      type: true,
      status: true,
    },
  },
};

export const moneyRepository = {
  findTaskById(taskId) {
    return prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, status: true, type: true },
    });
  },

  upsertCommitment(payload) {
    return prisma.moneyCommitment.upsert({
      where: {
        userId_taskId_triggerType: {
          userId: payload.userId,
          taskId: payload.taskId,
          triggerType: payload.triggerType,
        },
      },
      update: {
        amount: payload.amount,
        active: payload.active,
      },
      create: {
        userId: payload.userId,
        taskId: payload.taskId,
        triggerType: payload.triggerType,
        amount: payload.amount,
        active: payload.active,
      },
      include: commitmentInclude,
    });
  },

  listCommitmentsByUser(userId, active) {
    return prisma.moneyCommitment.findMany({
      where: {
        userId,
        ...(typeof active === "boolean" ? { active } : {}),
      },
      include: commitmentInclude,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    });
  },

  listActiveCommitmentsByUser(userId) {
    return prisma.moneyCommitment.findMany({
      where: {
        userId,
        active: true,
      },
      include: commitmentInclude,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    });
  },

  listActivitiesForDate(userId, taskIds, dateStart, dateEnd) {
    return prisma.activity.findMany({
      where: {
        userId,
        taskId: { in: taskIds },
        occurredAt: {
          gte: dateStart,
          lte: dateEnd,
        },
      },
      select: {
        taskId: true,
        type: true,
        isForbidden: true,
      },
    });
  },

  createMoneyEntries(entries) {
    if (entries.length === 0) {
      return { count: 0 };
    }

    return prisma.moneyEntry.createMany({
      data: entries,
      skipDuplicates: true,
    });
  },

  listMoneyEntriesByUser(userId, limit) {
    return prisma.moneyEntry.findMany({
      where: { userId, removedAt: null },
      include: entryInclude,
      orderBy: [{ date: "desc" }, { id: "desc" }],
      take: limit,
    });
  },

  listOutstandingEntriesByUser(userId) {
    return prisma.moneyEntry.findMany({
      where: { userId, removedAt: null },
      include: entryInclude,
      orderBy: [{ date: "desc" }, { id: "desc" }],
    });
  },

  listSettlementEntriesByUser(userId, limit) {
    return prisma.moneyEntry.findMany({
      where: {
        userId,
        removedAt: { not: null },
        removedReason: {
          startsWith: "USER_SETTLED:",
        },
      },
      include: entryInclude,
      orderBy: [{ removedAt: "desc" }, { id: "desc" }],
      take: limit,
    });
  },

  sumMoneyEntriesByUser(userId) {
    return prisma.moneyEntry.aggregate({
      where: { userId, removedAt: null },
      _sum: {
        amount: true,
      },
    });
  },

  async softDeleteMoneyEntry(userId, id, removedReason) {
    const result = await prisma.moneyEntry.updateMany({
      where: {
        id,
        userId,
        removedAt: null,
      },
      data: {
        removedAt: new Date(),
        removedReason,
      },
    });

    return result.count;
  },

  findMoneyEntryById(userId, id) {
    return prisma.moneyEntry.findFirst({
      where: { userId, id },
    });
  },

  deleteCommitmentById(userId, id) {
    return prisma.moneyCommitment.deleteMany({
      where: {
        id,
        userId,
      },
    });
  },

  findCommitmentById(userId, id) {
    return prisma.moneyCommitment.findFirst({
      where: {
        id,
        userId,
      },
      include: commitmentInclude,
    });
  },

  softDeleteEntriesByIds(userId, ids, removedReason, removedAt = new Date()) {
    if (ids.length === 0) {
      return { count: 0 };
    }

    return prisma.moneyEntry.updateMany({
      where: {
        userId,
        id: { in: ids },
        removedAt: null,
      },
      data: {
        removedAt,
        removedReason,
      },
    });
  },
};
