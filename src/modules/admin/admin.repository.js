import { prisma } from "../../core/db/prisma.js";

const taskCounterRuleInclude = {
  task: {
    select: {
      id: true,
      key: true,
      title: true,
      type: true,
      status: true,
    },
  },
  counter: {
    select: {
      id: true,
      key: true,
      name: true,
      unit: true,
      isActive: true,
    },
  },
};

const taskListSelect = {
  id: true,
  key: true,
  title: true,
  description: true,
  type: true,
  status: true,
  basePoints: true,
  isPrivate: true,
  startsAt: true,
  endsAt: true,
  createdAt: true,
  config: true,
  tagRequirements: {
    select: {
      tag: {
        select: {
          key: true,
        },
      },
    },
  },
};

export const adminRepository = {
  listCounters(query) {
    return prisma.counterDefinition.findMany({
      where: query.includeInactive ? {} : { isActive: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit,
    });
  },

  listTasks(query) {
    return prisma.task.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.type ? { type: query.type } : {}),
        ...(query.includePrivate ? {} : { isPrivate: false }),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit,
      select: taskListSelect,
    });
  },

  listUsers(query) {
    return prisma.user.findMany({
      where: {
        isActive: true,
        ...(query.search
          ? {
              OR: [
                {
                  email: {
                    contains: query.search,
                    mode: "insensitive",
                  },
                },
                {
                  displayName: {
                    contains: query.search,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit,
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        isLeaderboardVisible: true,
      },
    });
  },

  findUserById(userId) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        isActive: true,
        isLeaderboardVisible: true,
      },
    });
  },

  deactivateUserById(userId) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        isActive: true,
        isLeaderboardVisible: true,
      },
    });
  },

  updateUserLeaderboardVisibility(userId, isLeaderboardVisible) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        isLeaderboardVisible,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isActive: true,
        isLeaderboardVisible: true,
      },
    });
  },

  clearUserAvatar(userId) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        avatarUrl: null,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isActive: true,
        avatarUrl: true,
      },
    });
  },

  listUserActivitiesForAdmin(userId, limit) {
    return prisma.activity.findMany({
      where: {
        userId,
        type: "TASK_COMPLETION",
        isForbidden: false,
      },
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

  listTagsByIds(tagIds) {
    return prisma.tag.findMany({
      where: {
        id: { in: tagIds },
        isActive: true,
      },
    });
  },

  listUsersByIds(userIds) {
    return prisma.user.findMany({
      where: {
        id: { in: userIds },
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
      },
    });
  },

  listAllActiveUsers() {
    return prisma.user.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
      },
    });
  },

  listUserIdsByTagIds(tagIds) {
    return prisma.userTag.findMany({
      where: {
        tagId: { in: tagIds },
      },
      distinct: ["userId"],
      select: {
        userId: true,
      },
    });
  },
  findTaskById(taskId) {
    return prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        key: true,
        status: true,
        type: true,
        isPrivate: true,
        startsAt: true,
        endsAt: true,
        config: true,
      },
    });
  },

  updateTask(taskId, data, requiredTagIds) {
    return prisma.$transaction(async (tx) => {
      if (Array.isArray(requiredTagIds)) {
        await tx.taskTagRequirement.deleteMany({ where: { taskId } });

        if (requiredTagIds.length > 0) {
          await tx.taskTagRequirement.createMany({
            data: requiredTagIds.map((tagId) => ({ taskId, tagId })),
          });
        }
      }

      await tx.task.update({
        where: { id: taskId },
        data,
      });

      return tx.task.findUnique({
        where: { id: taskId },
        select: taskListSelect,
      });
    });
  },

  deleteTaskById(taskId) {
    return prisma.task.delete({
      where: { id: taskId },
      select: {
        id: true,
        key: true,
        title: true,
      },
    });
  },

  findCounterById(counterId) {
    return prisma.counterDefinition.findUnique({
      where: { id: counterId },
      select: {
        id: true,
        key: true,
        isActive: true,
      },
    });
  },

  listTagsByKeys(tagKeys) {
    return prisma.tag.findMany({
      where: {
        key: { in: tagKeys },
        isActive: true,
      },
    });
  },

  listCountersByKeys(counterKeys) {
    return prisma.counterDefinition.findMany({
      where: {
        key: { in: counterKeys },
        isActive: true,
      },
    });
  },

  createCounter(payload) {
    return prisma.counterDefinition.create({
      data: {
        key: payload.key,
        name: payload.name,
        unit: payload.unit,
        description: payload.description,
        isActive: payload.isActive ?? true,
      },
    });
  },

  createTaskCounterRule(payload) {
    return prisma.taskCounterRule.create({
      data: {
        taskId: payload.taskId,
        counterId: payload.counterId,
        valueSource: payload.valueSource,
        fixedDelta: payload.fixedDelta,
      },
      include: taskCounterRuleInclude,
    });
  },

  listTaskCounterRules(query) {
    return prisma.taskCounterRule.findMany({
      where: {
        ...(query.taskId ? { taskId: query.taskId } : {}),
        ...(query.counterId ? { counterId: query.counterId } : {}),
      },
      include: taskCounterRuleInclude,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
  },

  findTaskCounterRuleById(id) {
    return prisma.taskCounterRule.findUnique({
      where: { id },
      include: taskCounterRuleInclude,
    });
  },

  deleteTaskCounterRuleById(id) {
    return prisma.taskCounterRule.delete({
      where: { id },
      include: taskCounterRuleInclude,
    });
  },

  createTask(payload, adminId) {
    return prisma.task.create({
      data: {
        key: payload.key,
        title: payload.title,
        description: payload.description,
        type: payload.type,
        status: payload.status,
        basePoints: payload.basePoints,
        config: payload.config,
        isPrivate: payload.isPrivate,
        startsAt: payload.startsAt,
        endsAt: payload.endsAt,
        createdById: adminId,
        tagRequirements:
          payload.requiredTagIds.length > 0
            ? {
                create: payload.requiredTagIds.map((tagId) => ({ tagId })),
              }
            : undefined,
        dependencies:
          payload.dependencies.length > 0
            ? {
                create: payload.dependencies.map((dependency) => ({
                  dependsOnTaskId: dependency.dependsOnTaskId,
                  minCompletions: dependency.minCompletions,
                  withinDays: dependency.withinDays,
                })),
              }
            : undefined,
        counterRules:
          payload.counterRules.length > 0
            ? {
                create: payload.counterRules.map((rule) => ({
                  counterId: rule.counterId,
                  valueSource: rule.valueSource,
                  fixedDelta: rule.fixedDelta,
                  allowNegative: rule.allowNegative,
                  metadata: rule.metadata,
                })),
              }
            : undefined,
        conditions:
          payload.conditions.length > 0
            ? {
                create: payload.conditions.map((condition) => ({
                  type: condition.type,
                  operator: condition.operator,
                  value: condition.value,
                  targetTaskId: condition.targetTaskId,
                  targetCounterId: condition.targetCounterId,
                  targetTagId: condition.targetTagId,
                  withinDays: condition.withinDays,
                })),
              }
            : undefined,
      },
      include: {
        tagRequirements: true,
        dependencies: true,
        counterRules: true,
        conditions: true,
      },
    });
  },

  createManualAdjustment(payload, adminId, timezone) {
    return prisma.activity.create({
      data: {
        userId: payload.userId,
        type: "MANUAL_ADJUSTMENT",
        occurredAt: new Date(),
        timezone,
        isDuringFasting: false,
        fastingMultiplier: 1,
        basePoints: payload.points,
        effectivePoints: payload.points,
        note: payload.note,
        metadata: payload.metadata,
        isForbidden: false,
        createdByAdminId: adminId,
      },
    });
  },

  createNotificationCampaign(payload, adminId) {
    return prisma.notificationCampaign.create({
      data: {
        title: payload.title,
        body: payload.body,
        targetType: payload.targetType,
        filters: payload.filters,
        status: "PENDING",
        createdById: adminId,
        targetTags:
          payload.targetTagIds.length > 0
            ? {
                create: payload.targetTagIds.map((tagId) => ({ tagId })),
              }
            : undefined,
      },
      include: {
        targetTags: {
          include: {
            tag: true,
          },
        },
      },
    });
  },

  findNotificationCampaignById(campaignId) {
    return prisma.notificationCampaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        title: true,
      },
    });
  },

  deleteNotificationCampaignById(campaignId) {
    return prisma.notificationCampaign.delete({
      where: { id: campaignId },
      select: {
        id: true,
        title: true,
      },
    });
  },

  createNotificationRecipients(campaignId, userIds) {
    if (userIds.length === 0) {
      return { count: 0 };
    }

    return prisma.notificationRecipient.createMany({
      data: userIds.map((userId) => ({
        campaignId,
        userId,
      })),
      skipDuplicates: true,
    });
  },

  async listNotificationCampaigns(limit) {
    const campaigns = await prisma.notificationCampaign.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit,
      include: {
        targetTags: {
          include: {
            tag: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });

    if (campaigns.length === 0) {
      return [];
    }

    const campaignIds = campaigns.map((campaign) => campaign.id);
    const grouped = await prisma.notificationRecipient.groupBy({
      by: ["campaignId", "status"],
      where: {
        campaignId: { in: campaignIds },
      },
      _count: {
        _all: true,
      },
    });

    const countsByCampaign = new Map();
    for (const row of grouped) {
      if (!countsByCampaign.has(row.campaignId)) {
        countsByCampaign.set(row.campaignId, {
          pending: 0,
          sent: 0,
          failed: 0,
        });
      }

      const entry = countsByCampaign.get(row.campaignId);
      if (row.status === "PENDING") {
        entry.pending = row._count._all;
      } else if (row.status === "SENT") {
        entry.sent = row._count._all;
      } else if (row.status === "FAILED") {
        entry.failed = row._count._all;
      }
    }

    return campaigns.map((campaign) => ({
      campaign,
      stats: countsByCampaign.get(campaign.id) || {
        pending: 0,
        sent: 0,
        failed: 0,
      },
    }));
  },

  createDailyQuestion(payload, adminId) {
    return prisma.dailyQuestion.create({
      data: {
        questionText: payload.questionText,
        answerType: payload.answerType,
        options: payload.options,
        correctAnswer: payload.correctAnswer,
        points: payload.points,
        activeDate: payload.activeDate,
        isActive: payload.isActive ?? true,
        createdById: adminId,
      },
    });
  },

  listDailyQuestions(limit) {
    return prisma.dailyQuestion.findMany({
      orderBy: [{ activeDate: "desc" }, { id: "desc" }],
      take: limit,
      select: {
        id: true,
        questionText: true,
        answerType: true,
        options: true,
        correctAnswer: true,
        points: true,
        activeDate: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            answers: true,
          },
        },
      },
    });
  },

  findDailyQuestionById(questionId) {
    return prisma.dailyQuestion.findUnique({
      where: { id: questionId },
    });
  },

  updateDailyQuestionById(questionId, data) {
    return prisma.dailyQuestion.update({
      where: { id: questionId },
      data,
    });
  },

  deleteDailyQuestionById(questionId) {
    return prisma.dailyQuestion.delete({
      where: { id: questionId },
      select: {
        id: true,
        questionText: true,
        activeDate: true,
      },
    });
  },

  findDailyQuestionByDate(dateOnly) {
    return prisma.dailyQuestion.findUnique({
      where: { activeDate: dateOnly },
    });
  },

  listDailyQuestionAnswers(questionId, limit) {
    return prisma.dailyQuestionAnswer.findMany({
      where: { questionId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });
  },

  findDailyQuestionAnswerById(answerId) {
    return prisma.dailyQuestionAnswer.findUnique({
      where: { id: answerId },
      include: {
        question: {
          select: {
            id: true,
            answerType: true,
            points: true,
            isActive: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });
  },

  reviewDailyQuestionAnswer(answerId, data) {
    return prisma.dailyQuestionAnswer.update({
      where: { id: answerId },
      data,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });
  },

  async revealDailyQuestionAnswers(questionId, revealedAt, timezone) {
    return prisma.$transaction(async (tx) => {
      const answers = await tx.dailyQuestionAnswer.findMany({
        where: {
          questionId,
          isRevealed: false,
        },
      });

      if (answers.length > 0) {
        await tx.dailyQuestionAnswer.updateMany({
          where: {
            questionId,
            isRevealed: false,
          },
          data: {
            isRevealed: true,
            revealedAt,
          },
        });

        await tx.activity.createMany({
          data: answers.map((answer) => ({
            userId: answer.userId,
            type: "DAILY_QUESTION_ANSWER",
            occurredAt: revealedAt,
            timezone,
            isDuringFasting: false,
            fastingMultiplier: 1,
            basePoints: answer.awardedPoints,
            effectivePoints: answer.awardedPoints,
            note: "Daily question revealed",
            metadata: {
              questionId,
              isCorrect: answer.isCorrect,
            },
          })),
        });
      }

      return { revealedCount: answers.length };
    });
  },

  createAdminActionLog(payload) {
    return prisma.adminActionLog.create({
      data: {
        adminId: payload.adminId,
        action: payload.action,
        entityType: payload.entityType,
        entityId: payload.entityId,
        summary: payload.summary,
        payload: payload.payload,
      },
    });
  },

  async getLeaderboardRows(limit) {
    const [users, grouped] = await Promise.all([
      prisma.user.findMany({
        where: {
          isActive: true,
          role: "USER",
        },
        select: {
          id: true,
          displayName: true,
          email: true,
          avatarUrl: true,
          isLeaderboardVisible: true,
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
      return [];
    }

    const totalsByUserId = new Map(
      grouped.map((row) => [row.userId, Number(row._sum.effectivePoints || 0)])
    );

    return users
      .map((user) => ({
        user,
        totalPoints: totalsByUserId.get(user.id) || 0,
      }))
      .sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) {
          return b.totalPoints - a.totalPoints;
        }
        return a.user.id - b.user.id;
      })
      .slice(0, limit);
  },
};
