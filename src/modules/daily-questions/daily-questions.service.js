import { AppError } from "../../core/errors/app-error.js";
import { env } from "../../core/config/env.js";
import { getAuthUserId } from "../../core/utils/get-auth-user-id.js";
import { toAppDateString, toDateOnly } from "../../core/utils/timezone.js";
import { getOrCreateFastingWindow } from "../../integrations/prayer-times/prayer-time.service.js";
import { dailyQuestionsRepository } from "./daily-questions.repository.js";

function normalize(value) {
  return String(value).trim().toLowerCase();
}

function sanitizeQuestionForUser(question) {
  if (!question) {
    return null;
  }

  const { correctAnswer: _correctAnswer, ...safeQuestion } = question;
  return safeQuestion;
}

function normalizeArray(values) {
  return Array.from(new Set(values.map((value) => normalize(value)))).sort();
}

function parseBoolean(value) {
  if (value === true || value === "true" || value === 1 || value === "1") {
    return true;
  }

  if (value === false || value === "false" || value === 0 || value === "0") {
    return false;
  }

  return null;
}

function evaluateAnswer(question, answer) {
  if (question.correctAnswer === null || question.correctAnswer === undefined) {
    return null;
  }

  if (question.answerType === "TEXT") {
    return null;
  }

  if (question.answerType === "SINGLE_CHOICE") {
    return normalize(answer) === normalize(question.correctAnswer);
  }

  if (question.answerType === "BOOLEAN") {
    const parsedAnswer = parseBoolean(answer);
    const parsedCorrect = parseBoolean(question.correctAnswer);

    if (parsedAnswer === null || parsedCorrect === null) {
      return false;
    }

    return parsedAnswer === parsedCorrect;
  }

  if (question.answerType === "MULTIPLE_CHOICE") {
    if (!Array.isArray(answer) || !Array.isArray(question.correctAnswer)) {
      return false;
    }

    const left = normalizeArray(answer);
    const right = normalizeArray(question.correctAnswer);

    if (left.length !== right.length) {
      return false;
    }

    return left.every((value, index) => value === right[index]);
  }

  return false;
}

async function resolveCompetitionDateByFajr(now = new Date()) {
  const todayWindow = await getOrCreateFastingWindow(now);
  const competitionDateSource =
    now < todayWindow.fajrAt ? new Date(now.getTime() - 24 * 60 * 60 * 1000) : now;

  return toDateOnly(toAppDateString(competitionDateSource));
}

async function revealDueAnswersByFajr(now = new Date()) {
  const competitionDate = await resolveCompetitionDateByFajr(now);
  const revealedAt = new Date();

  await dailyQuestionsRepository.revealAnswersBeforeDate(
    competitionDate,
    revealedAt,
    env.appTimezone
  );
}

export const dailyQuestionsService = {
  async getTodayQuestion() {
    await revealDueAnswersByFajr(new Date());
    const dateOnly = await resolveCompetitionDateByFajr(new Date());

    const question = await dailyQuestionsRepository.findActiveByDate(dateOnly);
    return sanitizeQuestionForUser(question);
  },

  async submitAnswer(auth, questionId, payload) {
    const userId = getAuthUserId(auth);
    const question = await dailyQuestionsRepository.findById(questionId);

    if (!question || !question.isActive) {
      throw new AppError(404, "Daily question not found");
    }

    const existing = await dailyQuestionsRepository.findUserAnswer(questionId, userId);
    if (existing) {
      throw new AppError(409, "Daily question already answered");
    }

    const isCorrect = evaluateAnswer(question, payload.answer);
    const awardedPoints = isCorrect === true ? Number(question.points) : 0;

    return dailyQuestionsRepository.createAnswer({
      questionId,
      userId,
      answer: payload.answer,
      isCorrect,
      awardedPoints,
    });
  },

  async getMyHistory(auth, query) {
    const userId = getAuthUserId(auth);
    await revealDueAnswersByFajr(new Date());
    const rows = await dailyQuestionsRepository.listUserHistory(userId, query.limit);

    return rows.map((row) => ({
      id: row.id,
      question: sanitizeQuestionForUser(row.question),
      questionCorrectAnswer: row.isRevealed ? row.question.correctAnswer : null,
      answer: row.answer,
      status: row.isRevealed ? "revealed" : "pending",
      isCorrect: row.isRevealed ? row.isCorrect : null,
      awardedPoints: row.isRevealed ? Number(row.awardedPoints) : 0,
      createdAt: row.createdAt,
      revealedAt: row.revealedAt,
    }));
  },
};
