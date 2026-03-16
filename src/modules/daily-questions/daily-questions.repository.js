import { prisma } from "../../core/db/prisma.js";

export const dailyQuestionsRepository = {
  findActiveByDate(dateOnly) {
    return prisma.dailyQuestion.findFirst({
      where: {
        activeDate: dateOnly,
        isActive: true,
      },
      orderBy: { id: "desc" },
    });
  },
  findByDate(dateOnly) {
    return prisma.dailyQuestion.findUnique({
      where: { activeDate: dateOnly },
    });
  },

  findById(questionId) {
    return prisma.dailyQuestion.findUnique({
      where: { id: questionId },
    });
  },

  findUserAnswer(questionId, userId) {
    return prisma.dailyQuestionAnswer.findUnique({
      where: {
        questionId_userId: {
          questionId,
          userId,
        },
      },
    });
  },

  createAnswer(payload) {
    return prisma.dailyQuestionAnswer.create({
      data: {
        questionId: payload.questionId,
        userId: payload.userId,
        answer: payload.answer,
        isCorrect: payload.isCorrect,
        awardedPoints: payload.awardedPoints,
      },
    });
  },

  listUserHistory(userId, limit, competitionDate) {
    return prisma.dailyQuestion.findMany({
      where: {
        activeDate: {
          lte: competitionDate,
        },
      },
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
        answers: {
          where: { userId },
          take: 1,
          select: {
            id: true,
            answer: true,
            isCorrect: true,
            awardedPoints: true,
            isRevealed: true,
            revealedAt: true,
            createdAt: true,
          },
        },
      },
    });
  },

  async revealAnswersBeforeDate(beforeDate, revealedAt, timezone) {
    return prisma.$transaction(async (tx) => {
      const answers = await tx.dailyQuestionAnswer.findMany({
        where: {
          isRevealed: false,
          question: {
            activeDate: {
              lt: beforeDate,
            },
          },
        },
        select: {
          id: true,
          userId: true,
          questionId: true,
          isCorrect: true,
          awardedPoints: true,
          question: {
            select: {
              questionText: true,
              answerType: true,
            },
          },
        },
      });

      if (answers.length === 0) {
        return { revealedCount: 0 };
      }

      const answerIds = answers.map((answer) => answer.id);

      const updateResult = await tx.dailyQuestionAnswer.updateMany({
        where: {
          id: { in: answerIds },
          isRevealed: false,
        },
        data: {
          isRevealed: true,
          revealedAt,
        },
      });

      if (updateResult.count === 0) {
        return { revealedCount: 0 };
      }

      // Idempotency under concurrency:
      // Only create activities for answers that were updated in THIS transaction (matching revealedAt).
      const revealedNow = await tx.dailyQuestionAnswer.findMany({
        where: {
          id: { in: answerIds },
          isRevealed: true,
          revealedAt,
        },
        select: {
          id: true,
          userId: true,
          questionId: true,
          isCorrect: true,
          awardedPoints: true,
          question: {
            select: {
              questionText: true,
              answerType: true,
            },
          },
        },
      });

      if (revealedNow.length > 0) {
        await tx.activity.createMany({
          data: revealedNow.map((answer) => ({
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
              questionId: answer.questionId,
              questionText: answer.question.questionText,
              answerType: answer.question.answerType,
              isCorrect: answer.isCorrect,
            },
          })),
        });
      }

      return { revealedCount: revealedNow.length };
    });
  },
};
