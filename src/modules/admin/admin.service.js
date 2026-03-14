import { AppError } from "../../core/errors/app-error.js";
import { env } from "../../core/config/env.js";
import { getAuthUserId } from "../../core/utils/get-auth-user-id.js";
import { toAppDateString, toDateOnly } from "../../core/utils/timezone.js";
import { getOrCreateFastingWindow } from "../../integrations/prayer-times/prayer-time.service.js";
import { fetchIslamicDailyQuestionSuggestions } from "../../integrations/daily-question-suggestions/islamic-questions.client.js";
import {
  generateMotivationMessageWithAi,
  generateDailyQuestionSuggestionWithAi,
  rewriteDailyQuestionSuggestionWithAi,
} from "../../integrations/ai-assistant/ai-assistant.client.js";
import { normalizeAdminPermissions } from "../../core/auth/admin-permissions.js";
import bcrypt from "bcrypt";
import { adminRepository } from "./admin.repository.js";

const SCORING_MULTIPLIER_SETTING_KEY = "SCORING_MULTIPLIER";
const DEFAULT_SCORING_MULTIPLIER_CONFIG = {
  multiplierValue: 1.5,
  applyDuring: "IFTAR",
};
const AI_ASSIST_SETTINGS_KEY = "AI_ASSIST_SETTINGS";
const DEFAULT_AI_ASSIST_SETTINGS = {
  enabled: false,
  baseUrl: "https://ramadan-ai.fly.dev",
  model: "qwen2.5:3b-instruct",
  timeoutMs: 25000,
};

const WEEKDAY_FORMATTER_AR = new Intl.DateTimeFormat("ar-EG", {
  timeZone: env.appTimezone,
  weekday: "long",
});

function normalizeUniqueKeys(values) {
  return Array.from(
    new Set(
      values
        .map((value) => String(value).trim())
        .filter(Boolean)
    )
  );
}

function normalizeCategoryTagKey(value) {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!slug) {
    return null;
  }

  return `task_category:${slug}`;
}

function buildKeyMap(rows) {
  return new Map(rows.map((row) => [row.key, row.id]));
}

function assertResolvedKeys(requestedKeys, keyMap, entityName) {
  const missing = requestedKeys.filter((key) => !keyMap.has(key));
  if (missing.length > 0) {
    throw new AppError(400, `Unknown ${entityName} keys`, { missing });
  }
}

function assertResolvedIds(requestedIds, resolvedIds, entityName) {
  const resolvedIdSet = new Set(resolvedIds);
  const missing = requestedIds.filter((id) => !resolvedIdSet.has(id));
  if (missing.length > 0) {
    throw new AppError(400, `Unknown ${entityName} ids`, { missing });
  }
}

function toOptionalDate(dateString, fieldName) {
  if (!dateString) {
    return undefined;
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(400, `Invalid ${fieldName} datetime`);
  }

  return date;
}

function toNullableDate(dateInput, fieldName) {
  if (dateInput === undefined) {
    return undefined;
  }

  if (dateInput === null) {
    return null;
  }

  return toOptionalDate(dateInput, fieldName);
}

async function resolveCompetitionDateByFajr(now = new Date()) {
  const todayWindow = await getOrCreateFastingWindow(now);
  const competitionDateSource =
    now < todayWindow.fajrAt ? new Date(now.getTime() - 24 * 60 * 60 * 1000) : now;

  return {
    dateString: toAppDateString(competitionDateSource),
    dateOnly: toDateOnly(toAppDateString(competitionDateSource)),
  };
}

async function attachCompetitionDateToActivities(rows) {
  const competitionDateCache = new Map();
  const windowCache = new Map();

  return Promise.all(
    rows.map(async (row) => {
      const occurredAt = new Date(row.occurredAt);
      const appDateString = toAppDateString(occurredAt);
      let window = windowCache.get(appDateString);
      if (!window) {
        window = await getOrCreateFastingWindow(occurredAt);
        windowCache.set(appDateString, window);
      }
      const beforeFajr = occurredAt < window.fajrAt;
      const cacheKey = `${appDateString}|${beforeFajr ? "before" : "after"}`;
      let competitionDate = competitionDateCache.get(cacheKey);
      if (!competitionDate) {
        competitionDate = beforeFajr
          ? toAppDateString(new Date(occurredAt.getTime() - 24 * 60 * 60 * 1000))
          : appDateString;
        competitionDateCache.set(cacheKey, competitionDate);
      }

      return {
        ...row,
        competitionDate,
      };
    })
  );
}

function parseActivityMetadataObject(row) {
  if (!row?.metadata || typeof row.metadata !== "object" || Array.isArray(row.metadata)) {
    return null;
  }

  return row.metadata;
}

function parseDailyQuestionId(metadata) {
  const questionId = Number(metadata?.questionId);
  if (!Number.isInteger(questionId) || questionId <= 0) {
    return null;
  }
  return questionId;
}

async function enrichDailyQuestionAnswerType(rows) {
  const questionIds = Array.from(
    new Set(
      rows
        .filter((row) => row.type === "DAILY_QUESTION_ANSWER")
        .map((row) => parseActivityMetadataObject(row))
        .filter((metadata) => metadata && !metadata.answerType)
        .map((metadata) => parseDailyQuestionId(metadata))
        .filter((id) => id !== null)
    )
  );

  if (questionIds.length === 0) {
    return rows;
  }

  const questions = await adminRepository.findDailyQuestionsByIds(questionIds);
  const answerTypeByQuestionId = new Map(
    questions.map((question) => [question.id, question.answerType])
  );

  return rows.map((row) => {
    if (row.type !== "DAILY_QUESTION_ANSWER") {
      return row;
    }

    const metadata = parseActivityMetadataObject(row);
    if (!metadata || metadata.answerType) {
      return row;
    }

    const questionId = parseDailyQuestionId(metadata);
    if (!questionId) {
      return row;
    }

    const answerType = answerTypeByQuestionId.get(questionId);
    if (!answerType) {
      return row;
    }

    return {
      ...row,
      metadata: {
        ...metadata,
        answerType,
      },
    };
  });
}

function parseQuestionChoices(options) {
  if (!Array.isArray(options)) {
    if (options && typeof options === "object" && !Array.isArray(options)) {
      const choices = options.choices;
      if (Array.isArray(choices)) {
        return choices
          .map((choice) => String(choice).trim())
          .filter(Boolean);
      }
    }
    return [];
  }

  return options
    .map((choice) => String(choice).trim())
    .filter(Boolean);
}

function normalizeAnswerExplanation(value) {
  if (value === undefined || value === null) {
    return undefined;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : undefined;
}

function packCorrectAnswer(value, explanation) {
  if (!explanation) {
    return value;
  }

  return {
    value,
    explanation,
  };
}

function unpackCorrectAnswerValue(value) {
  if (value && typeof value === "object" && !Array.isArray(value) && "value" in value) {
    return value.value;
  }

  return value;
}

function unpackCorrectAnswerExplanation(value) {
  if (value && typeof value === "object" && !Array.isArray(value) && "explanation" in value) {
    const explanation = String(value.explanation || "").trim();
    return explanation.length > 0 ? explanation : undefined;
  }

  return undefined;
}

function getCorrectAnswerValue(value) {
  if (value && typeof value === "object" && !Array.isArray(value) && "value" in value) {
    return value.value;
  }

  return value;
}

function normalizeText(value) {
  return String(value).trim().toLowerCase();
}

function normalizeTextArray(values) {
  return Array.from(new Set(values.map((value) => normalizeText(value)))).sort();
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

function evaluateDailyQuestionAnswer(question, answer) {
  const correctAnswer = getCorrectAnswerValue(question.correctAnswer);
  if (correctAnswer === null || correctAnswer === undefined) {
    return null;
  }

  if (question.answerType === "TEXT") {
    return null;
  }

  if (question.answerType === "SINGLE_CHOICE") {
    return normalizeText(answer) === normalizeText(correctAnswer);
  }

  if (question.answerType === "BOOLEAN") {
    const parsedAnswer = parseBoolean(answer);
    const parsedCorrect = parseBoolean(correctAnswer);
    if (parsedAnswer === null || parsedCorrect === null) {
      return false;
    }
    return parsedAnswer === parsedCorrect;
  }

  if (question.answerType === "MULTIPLE_CHOICE") {
    if (!Array.isArray(answer) || !Array.isArray(correctAnswer)) {
      return false;
    }
    const left = normalizeTextArray(answer);
    const right = normalizeTextArray(correctAnswer);
    if (left.length !== right.length) {
      return false;
    }
    return left.every((value, index) => value === right[index]);
  }

  return false;
}

function normalizeDailyQuestionPayload(payload) {
  const answerExplanation = normalizeAnswerExplanation(payload.answerExplanation);
  const normalized = {
    questionText: payload.questionText?.trim(),
    answerType: payload.answerType,
    options: payload.options,
    correctAnswer: payload.correctAnswer,
    points: payload.points,
    activeDate: payload.activeDate ? toDateOnly(payload.activeDate) : undefined,
    isActive: payload.isActive,
  };

  if (payload.answerType === "TEXT") {
    const textCorrectAnswer =
      payload.correctAnswer !== undefined && payload.correctAnswer !== null
        ? String(payload.correctAnswer).trim()
        : null;

    normalized.correctAnswer = packCorrectAnswer(textCorrectAnswer, answerExplanation);
    if (payload.correctAnswer !== undefined && payload.correctAnswer !== null) {
      normalized.correctAnswer = packCorrectAnswer(
        String(payload.correctAnswer).trim(),
        answerExplanation
      );
    }
    normalized.options = null;
    return normalized;
  }

  if (payload.answerType === "BOOLEAN") {
    normalized.options = ["True", "False"];
    const booleanCorrectAnswer = unpackCorrectAnswerValue(payload.correctAnswer);
    if (typeof booleanCorrectAnswer !== "boolean") {
      throw new AppError(400, "BOOLEAN question requires boolean correctAnswer");
    }
    normalized.correctAnswer = packCorrectAnswer(booleanCorrectAnswer, answerExplanation);
    return normalized;
  }

  const choices = parseQuestionChoices(payload.options);
  if (choices.length < 2) {
    throw new AppError(400, "Choice-based questions require at least 2 options");
  }
  normalized.options = choices;

  if (payload.answerType === "SINGLE_CHOICE") {
    const singleCorrectAnswer = String(unpackCorrectAnswerValue(payload.correctAnswer));
    if (!choices.includes(singleCorrectAnswer)) {
      throw new AppError(400, "SINGLE_CHOICE correctAnswer must match one option");
    }
    normalized.correctAnswer = packCorrectAnswer(singleCorrectAnswer, answerExplanation);
    return normalized;
  }

  if (payload.answerType === "MULTIPLE_CHOICE") {
    const multipleCorrectAnswer = unpackCorrectAnswerValue(payload.correctAnswer);
    if (!Array.isArray(multipleCorrectAnswer) || multipleCorrectAnswer.length === 0) {
      throw new AppError(400, "MULTIPLE_CHOICE requires at least one correct option");
    }

    const correctValues = multipleCorrectAnswer.map((value) => String(value));
    const unknownValues = correctValues.filter((value) => !choices.includes(value));
    if (unknownValues.length > 0) {
      throw new AppError(400, "MULTIPLE_CHOICE correctAnswer contains unknown options", {
        unknownValues,
      });
    }

    normalized.correctAnswer = packCorrectAnswer(
      Array.from(new Set(correctValues)),
      answerExplanation
    );
    return normalized;
  }

  return normalized;
}

function normalizeScoringSettingsValue(value) {
  const settingValue =
    value && typeof value === "object" && !Array.isArray(value) ? value : null;
  const rawMultiplier = Number(settingValue?.value ?? settingValue?.multiplierValue);
  const multiplierValue =
    Number.isFinite(rawMultiplier) && rawMultiplier >= 1
      ? Number(rawMultiplier.toFixed(2))
      : DEFAULT_SCORING_MULTIPLIER_CONFIG.multiplierValue;

  const rawApplyDuring =
    typeof settingValue?.applyDuring === "string"
      ? settingValue.applyDuring.trim().toUpperCase()
      : DEFAULT_SCORING_MULTIPLIER_CONFIG.applyDuring;
  const applyDuring =
    rawApplyDuring === "FASTING" || rawApplyDuring === "IFTAR"
      ? rawApplyDuring
      : DEFAULT_SCORING_MULTIPLIER_CONFIG.applyDuring;

  return {
    multiplierValue,
    applyDuring,
  };
}

function normalizeAiAssistSettingsValue(value) {
  const raw = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const enabled =
    raw.enabled === true || String(raw.enabled || "").trim().toLowerCase() === "true";
  const baseUrl =
    typeof raw.baseUrl === "string" && raw.baseUrl.trim().length > 0
      ? raw.baseUrl.trim().replace(/\/+$/, "")
      : DEFAULT_AI_ASSIST_SETTINGS.baseUrl;
  const model =
    typeof raw.model === "string" && raw.model.trim().length > 0
      ? raw.model.trim()
      : DEFAULT_AI_ASSIST_SETTINGS.model;
  const timeoutMsRaw = Number(raw.timeoutMs);
  const timeoutMs = Number.isFinite(timeoutMsRaw)
    ? Math.max(5000, Math.min(90000, Math.floor(timeoutMsRaw)))
    : DEFAULT_AI_ASSIST_SETTINGS.timeoutMs;

  return {
    enabled,
    baseUrl,
    model,
    timeoutMs,
  };
}

async function readAiAssistSettings() {
  const row = await adminRepository.getAppSetting(AI_ASSIST_SETTINGS_KEY);
  return normalizeAiAssistSettingsValue(row?.value);
}

function normalizeSuggestionTopic(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  if (
    normalized === "FIQH" ||
    normalized === "HADITH" ||
    normalized === "QURAN" ||
    normalized === "AQEEDAH" ||
    normalized === "SEERAH" ||
    normalized === "AKHLAQ"
  ) {
    return normalized;
  }
  return null;
}

function normalizeSuggestionDifficulty(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  if (normalized === "EASY" || normalized === "MEDIUM" || normalized === "HARD") {
    return normalized;
  }
  return null;
}

function normalizeStringArray(values) {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .map((value) => String(value).trim())
    .filter(Boolean);
}

function normalizeQuestionKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeSuggestionObject(rawSuggestion, answerType, fallbackSuggestion) {
  const suggestion =
    rawSuggestion && typeof rawSuggestion === "object" && !Array.isArray(rawSuggestion)
      ? rawSuggestion
      : {};

  const questionText = String(suggestion.questionText || fallbackSuggestion.questionText || "").trim();
  if (!questionText) {
    return null;
  }

  const answerExplanation = String(
    suggestion.answerExplanation || fallbackSuggestion.answerExplanation || ""
  ).trim();
  const topic =
    normalizeSuggestionTopic(suggestion.topic) ||
    normalizeSuggestionTopic(fallbackSuggestion.topic) ||
    "FIQH";
  const difficulty =
    normalizeSuggestionDifficulty(suggestion.difficulty) ||
    normalizeSuggestionDifficulty(fallbackSuggestion.difficulty) ||
    "MEDIUM";

  const base = {
    source: fallbackSuggestion.source || "islamqa_hf",
    questionText: questionText.slice(0, 220),
    answerType,
    answerExplanation: answerExplanation.slice(0, 320),
    topic,
    difficulty,
  };

  if (answerType === "TEXT") {
    const correctAnswer = String(
      suggestion.correctAnswer ?? fallbackSuggestion.correctAnswer ?? ""
    ).trim();
    return {
      ...base,
      options: null,
      correctAnswer: correctAnswer.slice(0, 160),
    };
  }

  if (answerType === "BOOLEAN") {
    const boolValue = parseBoolean(suggestion.correctAnswer);
    const fallbackBool = parseBoolean(fallbackSuggestion.correctAnswer);
    const correctAnswer = boolValue !== null ? boolValue : fallbackBool === true;
    return {
      ...base,
      options: ["\u0646\u0639\u0645", "\u0644\u0627"],
      correctAnswer,
    };
  }

  const options = normalizeStringArray(suggestion.options);
  const fallbackOptions = normalizeStringArray(fallbackSuggestion.options);
  const resolvedOptions = options.length >= 2 ? options.slice(0, 6) : fallbackOptions.slice(0, 6);
  if (resolvedOptions.length < 2) {
    return null;
  }

  if (answerType === "SINGLE_CHOICE") {
    const correctAnswer = String(
      suggestion.correctAnswer ?? fallbackSuggestion.correctAnswer ?? resolvedOptions[0]
    ).trim();
    const resolvedCorrect = resolvedOptions.includes(correctAnswer)
      ? correctAnswer
      : resolvedOptions[0];
    return {
      ...base,
      options: resolvedOptions,
      correctAnswer: resolvedCorrect,
    };
  }

  const candidateCorrectArray = normalizeStringArray(suggestion.correctAnswer);
  const fallbackCorrectArray = normalizeStringArray(fallbackSuggestion.correctAnswer);
  const rawCorrectArray = candidateCorrectArray.length > 0 ? candidateCorrectArray : fallbackCorrectArray;
  const resolvedCorrectArray = rawCorrectArray.filter((value) => resolvedOptions.includes(value));
  const finalCorrectArray = resolvedCorrectArray.length > 0 ? resolvedCorrectArray : [resolvedOptions[0]];

  return {
    ...base,
    options: resolvedOptions,
    correctAnswer: finalCorrectArray,
  };
}

function buildDailyQuestionStyleProfile(rows) {
  const recentRows = Array.isArray(rows) ? rows.slice(0, 80) : [];
  if (recentRows.length === 0) {
    return {
      totalQuestions: 0,
      averageQuestionLength: 90,
      averageExplanationLength: 120,
      answerTypeDistribution: {},
    };
  }

  let totalQuestionLength = 0;
  let totalExplanationLength = 0;
  const answerTypeDistribution = {};
  for (const row of recentRows) {
    const questionText = String(row?.questionText || "").trim();
    totalQuestionLength += questionText.length;
    const explanation = String(unpackCorrectAnswerExplanation(row?.correctAnswer) || "").trim();
    totalExplanationLength += explanation.length;
    const key = String(row?.answerType || "TEXT").trim();
    answerTypeDistribution[key] = (answerTypeDistribution[key] || 0) + 1;
  }

  return {
    totalQuestions: recentRows.length,
    averageQuestionLength: Math.round(totalQuestionLength / recentRows.length),
    averageExplanationLength: Math.round(totalExplanationLength / recentRows.length),
    answerTypeDistribution,
  };
}

async function maybeRewriteSuggestionWithAi(aiSettings, context) {
  if (!aiSettings.enabled) {
    return context.suggestion;
  }

  try {
    const rewritten = await rewriteDailyQuestionSuggestionWithAi(aiSettings, context);
    const normalized = normalizeSuggestionObject(
      rewritten,
      context.answerType,
      context.suggestion
    );
    return normalized || context.suggestion;
  } catch {
    return context.suggestion;
  }
}

function toDecimalNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildWeekdayNamesInArabic() {
  const weekdays = [];
  const start = new Date(Date.UTC(2026, 0, 4, 12, 0, 0));
  for (let index = 0; index < 7; index += 1) {
    const date = new Date(start.getTime() + index * 24 * 60 * 60 * 1000);
    weekdays.push(WEEKDAY_FORMATTER_AR.format(date));
  }
  return Array.from(new Set(weekdays));
}

const AR_WEEKDAYS = buildWeekdayNamesInArabic();

function getCairoWeekdayName(date) {
  return WEEKDAY_FORMATTER_AR.format(date);
}

function buildMotivationReportForUser(user, activities, lookbackDays) {
  const byDate = new Map();
  const byWeekday = new Map(AR_WEEKDAYS.map((name) => [name, 0]));
  let totalPoints = 0;
  let totalTasks = 0;

  for (const row of activities) {
    const occurredAt = new Date(row.occurredAt);
    const dateKey = toAppDateString(occurredAt);
    const weekdayName = getCairoWeekdayName(occurredAt);
    const points = toDecimalNumber(row.effectivePoints);

    totalTasks += 1;
    totalPoints += points;

    byWeekday.set(weekdayName, (byWeekday.get(weekdayName) || 0) + 1);
    if (!byDate.has(dateKey)) {
      byDate.set(dateKey, {
        tasks: 0,
        points: 0,
      });
    }
    const dayRow = byDate.get(dateKey);
    dayRow.tasks += 1;
    dayRow.points += points;
  }

  const activeDays = byDate.size;
  const inactiveDays = Math.max(0, lookbackDays - activeDays);
  const byDateRows = Array.from(byDate.entries());

  let bestDate = null;
  let weakestDate = null;
  let bestDateTasks = -1;
  let weakestDateTasks = Number.POSITIVE_INFINITY;

  for (const [dateKey, dayRow] of byDateRows) {
    if (dayRow.tasks > bestDateTasks) {
      bestDateTasks = dayRow.tasks;
      bestDate = dateKey;
    }
    if (dayRow.tasks < weakestDateTasks) {
      weakestDateTasks = dayRow.tasks;
      weakestDate = dateKey;
    }
  }

  let bestWeekday = null;
  let weakestWeekday = null;
  let bestWeekdayCount = -1;
  let weakestWeekdayCount = Number.POSITIVE_INFINITY;

  for (const [weekdayName, count] of byWeekday.entries()) {
    if (count > bestWeekdayCount) {
      bestWeekdayCount = count;
      bestWeekday = weekdayName;
    }
    if (count < weakestWeekdayCount) {
      weakestWeekdayCount = count;
      weakestWeekday = weekdayName;
    }
  }

  const summary = `\u062e\u0644\u0627\u0644 \u0622\u062e\u0631 ${lookbackDays} \u064a\u0648\u0645: \u0623\u0646\u062c\u0632\u062a ${totalTasks} \u0645\u0647\u0645\u0629 \u0641\u064a ${activeDays} \u064a\u0648\u0645 \u0646\u0634\u0637. \u0623\u0642\u0648\u0649 \u0646\u0634\u0627\u0637 \u0639\u0646\u062f\u0643 \u064a\u0648\u0645 ${bestWeekday || "-"}\u060c \u0648\u0623\u0642\u0644 \u0646\u0634\u0627\u0637 \u064a\u0648\u0645 ${weakestWeekday || "-"}.`;

  return {
    userId: user.id,
    displayName: user.displayName,
    email: user.email,
    summary,
    stats: {
      lookbackDays,
      totalTasks,
      totalPoints: Number(totalPoints.toFixed(2)),
      activeDays,
      inactiveDays,
      bestWeekday,
      weakestWeekday,
      bestDate,
      weakestDate,
    },
  };
}

function buildFallbackMotivationMessage(report) {
  const firstName = (report.displayName || report.email || "")
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)[0];
  const namePart = firstName ? ` ${firstName}` : "";

  if (report.stats.totalTasks <= 0) {
    return {
      title: `\u0628\u062f\u0627\u064a\u0629 \u062c\u062f\u064a\u062f\u0629${namePart}`.trim(),
      body: `\u064a\u0644\u0627 \u0646\u0628\u062f\u0623 \u0645\u0646 \u0627\u0644\u0646\u0647\u0627\u0631\u062f\u0647 \u0628\u0645\u0647\u0645\u0629 \u0648\u0627\u062d\u062f\u0629 \u0633\u0647\u0644\u0629. \u0627\u0644\u062e\u0637\u0648\u0629 \u0627\u0644\u0635\u063a\u064a\u0631\u0629 \u0628\u062a\u0641\u0631\u0642 \u062c\u062f\u0627\u064b.`.slice(
        0,
        220
      ),
    };
  }

  if (report.stats.inactiveDays > report.stats.activeDays) {
    return {
      title: `\u0631\u062c\u0648\u0639 \u0642\u0648\u064a${namePart}`.trim(),
      body: `\u0623\u0643\u062a\u0631 \u064a\u0648\u0645 \u0647\u0627\u062f\u064a \u0639\u0646\u062f\u0643 \u0643\u0627\u0646 ${report.stats.weakestWeekday || "\u064a\u0648\u0645 \u0645\u0639\u064a\u0646"}. \u062c\u0631\u0628 \u062a\u062b\u0628\u062a \u0645\u0647\u0645\u0629 \u0648\u0627\u062d\u062f\u0629 \u0641\u064a \u0627\u0644\u064a\u0648\u0645 \u062f\u0647 \u0648\u062d\u062a\u0634\u0648\u0641 \u0641\u0631\u0642 \u0643\u0628\u064a\u0631.`.slice(
        0,
        220
      ),
    };
  }

  return {
    title: `\u0645\u0633\u062a\u0648\u0649 \u0631\u0627\u0626\u0639${namePart}`.trim(),
    body: `\u0623\u062d\u0633\u0646 \u064a\u0648\u0645 \u0646\u0634\u0627\u0637 \u0639\u0646\u062f\u0643 ${report.stats.bestWeekday || "\u064a\u0648\u0645 \u0645\u0645\u064a\u0632"}. \u0643\u0645\u0644 \u0628\u0646\u0641\u0633 \u0627\u0644\u0625\u064a\u0642\u0627\u0639 \u0648\u0632\u0648\u062f \u0645\u0647\u0645\u0629 \u0628\u0633\u064a\u0637\u0629 \u0643\u0645\u0627\u0646.`.slice(
      0,
      220
    ),
  };
}

function countArabicCharacters(value) {
  if (!value) {
    return 0;
  }

  const matches = String(value).match(/[\u0600-\u06FF]/g);
  return matches ? matches.length : 0;
}

function looksArabicEnough(value) {
  const text = String(value || "").trim();
  if (!text) {
    return false;
  }

  const arabicCount = countArabicCharacters(text);
  if (arabicCount < 4) {
    return false;
  }

  const letterCount = (text.match(/[A-Za-z\u0600-\u06FF]/g) || []).length;
  if (letterCount <= 0) {
    return false;
  }

  return arabicCount / letterCount >= 0.45;
}

async function maybeGenerateMotivationMessageWithAi(aiSettings, report) {
  const fallback = buildFallbackMotivationMessage(report);
  if (!aiSettings.enabled) {
    return fallback;
  }

  try {
    const generated = await generateMotivationMessageWithAi(aiSettings, {
      displayName: report.displayName,
      email: report.email,
      summary: report.summary,
      stats: report.stats,
    });
    const title = String(generated?.title || "").trim();
    const body = String(generated?.body || "").trim();
    if (!title || !body) {
      return fallback;
    }
    if (!looksArabicEnough(title) || !looksArabicEnough(body)) {
      return fallback;
    }

    return {
      title: title.slice(0, 80),
      body: body.slice(0, 220),
    };
  } catch {
    return fallback;
  }
}

export const adminService = {
  async createCounter(auth, payload) {
    const adminId = getAuthUserId(auth);
    const counter = await adminRepository.createCounter(payload);

    await adminRepository.createAdminActionLog({
      adminId,
      action: "CREATE_COUNTER",
      entityType: "COUNTER",
      entityId: String(counter.id),
      summary: `Created counter ${counter.key}`,
      payload,
    });

    return counter;
  },

  listCounters(_auth, query) {
    return adminRepository.listCounters(query);
  },

  async createTaskCounterRule(auth, payload) {
    const adminId = getAuthUserId(auth);

    const [task, counter] = await Promise.all([
      adminRepository.findTaskById(payload.taskId),
      adminRepository.findCounterById(payload.counterId),
    ]);

    if (!task) {
      throw new AppError(404, "Task not found");
    }

    if (!counter) {
      throw new AppError(404, "Counter not found");
    }

    if (payload.valueSource === "FIXED" && typeof payload.fixedDelta !== "number") {
      throw new AppError(400, "fixedDelta is required when valueSource is FIXED");
    }

    try {
      const rule = await adminRepository.createTaskCounterRule({
        taskId: payload.taskId,
        counterId: payload.counterId,
        valueSource: payload.valueSource,
        fixedDelta: payload.valueSource === "FIXED" ? payload.fixedDelta : undefined,
      });

      await adminRepository.createAdminActionLog({
        adminId,
        action: "CREATE_TASK_COUNTER_RULE",
        entityType: "TASK_COUNTER_RULE",
        entityId: String(rule.id),
        summary: `Linked task ${payload.taskId} to counter ${payload.counterId}`,
        payload,
      });

      return rule;
    } catch (error) {
      if (error?.code === "P2002") {
        throw new AppError(409, "Task counter rule already exists for this task and counter");
      }

      throw error;
    }
  },

  listTaskCounterRules(_auth, query) {
    return adminRepository.listTaskCounterRules(query);
  },

  async deleteTaskCounterRule(auth, id) {
    const adminId = getAuthUserId(auth);

    const existingRule = await adminRepository.findTaskCounterRuleById(id);
    if (!existingRule) {
      throw new AppError(404, "Task counter rule not found");
    }

    const deletedRule = await adminRepository.deleteTaskCounterRuleById(id);

    await adminRepository.createAdminActionLog({
      adminId,
      action: "DELETE_TASK_COUNTER_RULE",
      entityType: "TASK_COUNTER_RULE",
      entityId: String(deletedRule.id),
      summary: `Removed task-counter link ${deletedRule.id}`,
      payload: {
        id: deletedRule.id,
        taskId: deletedRule.taskId,
        counterId: deletedRule.counterId,
      },
    });

    return deletedRule;
  },

  async createTask(auth, payload) {
    const adminId = getAuthUserId(auth);

    const startsAt = toOptionalDate(payload.startsAt, "startsAt");
    const endsAt = toOptionalDate(payload.endsAt, "endsAt");

    if (startsAt && endsAt && endsAt < startsAt) {
      throw new AppError(400, "endsAt must be greater than startsAt");
    }

    const requiredTagKeys = normalizeUniqueKeys(payload.requiredTagKeys);
    const conditionTagKeys = normalizeUniqueKeys(
      payload.conditions
        .map((condition) => condition.targetTagKey)
        .filter(Boolean)
    );
    const allTagKeys = normalizeUniqueKeys([...requiredTagKeys, ...conditionTagKeys]);

    const counterKeys = normalizeUniqueKeys([
      ...payload.counterRules.map((rule) => rule.counterKey),
      ...payload.conditions
        .map((condition) => condition.targetCounterKey)
        .filter(Boolean),
    ]);

    const [tags, counters] = await Promise.all([
      allTagKeys.length > 0 ? adminRepository.listTagsByKeys(allTagKeys) : [],
      counterKeys.length > 0 ? adminRepository.listCountersByKeys(counterKeys) : [],
    ]);

    const tagMap = buildKeyMap(tags);
    const counterMap = buildKeyMap(counters);

    assertResolvedKeys(allTagKeys, tagMap, "tag");
    assertResolvedKeys(counterKeys, counterMap, "counter");

    let categoryTagId;
    if (payload.categoryTag) {
      const normalizedKey = normalizeCategoryTagKey(payload.categoryTag.key);
      if (!normalizedKey) {
        throw new AppError(400, "Invalid category tag key");
      }

      const categoryTag = await adminRepository.upsertTaskCategoryTag({
        key: normalizedKey,
        label: payload.categoryTag.labelEn.trim(),
        labelEn: payload.categoryTag.labelEn.trim(),
        labelAr: payload.categoryTag.labelAr.trim(),
      });
      categoryTagId = categoryTag.id;
    } else if (payload.categoryTagId) {
      const categoryTag = await adminRepository.findTagById(payload.categoryTagId);
      if (!categoryTag || !categoryTag.isActive || !categoryTag.key.startsWith("task_category:")) {
        throw new AppError(400, "Unknown category tag id");
      }
      categoryTagId = categoryTag.id;
    }

    const resolvedCounterRules = payload.counterRules.map((rule) => {
      if (rule.valueSource === "FIXED" && typeof rule.fixedDelta !== "number") {
        throw new AppError(400, "fixedDelta is required when counter rule valueSource is FIXED", {
          counterKey: rule.counterKey,
        });
      }

      return {
        counterId: counterMap.get(rule.counterKey),
        valueSource: rule.valueSource,
        fixedDelta: rule.fixedDelta,
        allowNegative: rule.allowNegative,
        metadata: rule.metadata,
      };
    });

    const resolvedConditions = payload.conditions.map((condition) => ({
      type: condition.type,
      operator: condition.operator,
      value: condition.value,
      targetTaskId: condition.targetTaskId,
      targetCounterId: condition.targetCounterKey
        ? counterMap.get(condition.targetCounterKey)
        : undefined,
      targetTagId: condition.targetTagKey ? tagMap.get(condition.targetTagKey) : undefined,
      withinDays: condition.withinDays,
    }));

    const task = await adminRepository.createTask(
      {
        key: payload.key,
        title: payload.title,
        description: payload.description,
        type: payload.type,
        status: payload.status,
        basePoints: payload.basePoints,
        config: payload.config,
        isPrivate: payload.type === "FORBIDDEN" ? true : Boolean(payload.isPrivate),
        startsAt,
        endsAt,
        categoryTagId,
        requiredTagIds: requiredTagKeys.map((key) => tagMap.get(key)),
        dependencies: payload.dependencies,
        counterRules: resolvedCounterRules,
        conditions: resolvedConditions,
      },
      adminId
    );

    await adminRepository.createAdminActionLog({
      adminId,
      action: "CREATE_TASK",
      entityType: "TASK",
      entityId: String(task.id),
      summary: `Created task ${task.key}`,
      payload,
    });

    return task;
  },

  listTasks(_auth, query) {
    return adminRepository.listTasks(query);
  },

  async updateTask(auth, taskId, payload) {
    const adminId = getAuthUserId(auth);
    const existingTask = await adminRepository.findTaskById(taskId);

    if (!existingTask) {
      throw new AppError(404, "Task not found");
    }

    const hasUpdates =
      Object.keys(payload).length > 0;

    if (!hasUpdates) {
      throw new AppError(400, "No updates provided");
    }

    let requiredTagIds;
    if (payload.requiredTagKeys) {
      const requiredTagKeys = normalizeUniqueKeys(payload.requiredTagKeys);
      const tags =
        requiredTagKeys.length > 0 ? await adminRepository.listTagsByKeys(requiredTagKeys) : [];
      const tagMap = buildKeyMap(tags);
      assertResolvedKeys(requiredTagKeys, tagMap, "tag");
      requiredTagIds = requiredTagKeys.map((key) => tagMap.get(key));
    }

    let categoryTagId;
    if (payload.categoryTag === null || payload.categoryTagId === null) {
      categoryTagId = null;
    } else if (payload.categoryTag) {
      const normalizedKey = normalizeCategoryTagKey(payload.categoryTag.key);
      if (!normalizedKey) {
        throw new AppError(400, "Invalid category tag key");
      }

      const categoryTag = await adminRepository.upsertTaskCategoryTag({
        key: normalizedKey,
        label: payload.categoryTag.labelEn.trim(),
        labelEn: payload.categoryTag.labelEn.trim(),
        labelAr: payload.categoryTag.labelAr.trim(),
      });
      categoryTagId = categoryTag.id;
    } else if (payload.categoryTagId !== undefined) {
      const categoryTag = await adminRepository.findTagById(payload.categoryTagId);
      if (!categoryTag || !categoryTag.isActive || !categoryTag.key.startsWith("task_category:")) {
        throw new AppError(400, "Unknown category tag id");
      }
      categoryTagId = categoryTag.id;
    }

    const startsAt =
      payload.startsAt !== undefined ? toNullableDate(payload.startsAt, "startsAt") : undefined;
    const endsAt = payload.endsAt !== undefined ? toNullableDate(payload.endsAt, "endsAt") : undefined;

    const nextStartsAt = startsAt === undefined ? existingTask.startsAt : startsAt;
    const nextEndsAt = endsAt === undefined ? existingTask.endsAt : endsAt;
    if (nextStartsAt && nextEndsAt && nextEndsAt < nextStartsAt) {
      throw new AppError(400, "endsAt must be greater than startsAt");
    }

    const nextType = payload.type ?? existingTask.type;

    const updatedTask = await adminRepository.updateTask(
      taskId,
      {
        ...(payload.title !== undefined ? { title: payload.title } : {}),
        ...(payload.description !== undefined ? { description: payload.description } : {}),
        ...(payload.type !== undefined ? { type: payload.type } : {}),
        ...(payload.status !== undefined ? { status: payload.status } : {}),
        ...(payload.basePoints !== undefined ? { basePoints: payload.basePoints } : {}),
        ...(payload.config !== undefined ? { config: payload.config } : {}),
        ...(categoryTagId !== undefined ? { categoryTagId } : {}),
        ...(payload.isPrivate !== undefined || payload.type !== undefined
          ? {
              isPrivate: nextType === "FORBIDDEN" ? true : Boolean(payload.isPrivate),
            }
          : {}),
        ...(startsAt !== undefined ? { startsAt } : {}),
        ...(endsAt !== undefined ? { endsAt } : {}),
      },
      requiredTagIds
    );

    await adminRepository.createAdminActionLog({
      adminId,
      action: "UPDATE_TASK",
      entityType: "TASK",
      entityId: String(taskId),
      summary: `Updated task ${existingTask.key}`,
      payload,
    });

    return updatedTask;
  },

  async deleteTask(auth, taskId) {
    const adminId = getAuthUserId(auth);
    const existingTask = await adminRepository.findTaskById(taskId);
    if (!existingTask) {
      throw new AppError(404, "Task not found");
    }

    const deletedTask = await adminRepository.deleteTaskById(taskId);

    await adminRepository.createAdminActionLog({
      adminId,
      action: "DELETE_TASK",
      entityType: "TASK",
      entityId: String(taskId),
      summary: `Deleted task ${deletedTask.key}`,
      payload: deletedTask,
    });

    return deletedTask;
  },

  listUsers(_auth, query) {
    return adminRepository.listUsers(query);
  },

  async createAdminAccount(auth, payload) {
    if (auth.role !== "SUPER_ADMIN") {
      throw new AppError(403, "Only super admin can create admin accounts");
    }

    const existing = await adminRepository.findUserByEmail(payload.email);
    if (existing) {
      throw new AppError(409, "Email already registered");
    }

    const adminPermissions = normalizeAdminPermissions(payload.adminPermissions);
    const hashedPassword = await bcrypt.hash(payload.password, 10);
    const created = await adminRepository.createAdminAccount({
      email: payload.email,
      displayName: payload.displayName,
      passwordHash: hashedPassword,
      role: payload.role,
      adminPermissions,
    });

    await adminRepository.createAdminActionLog({
      adminId: getAuthUserId(auth),
      action: "CREATE_ADMIN_ACCOUNT",
      entityType: "USER",
      entityId: String(created.id),
      summary: `Created admin account ${created.email}`,
      payload: {
        email: created.email,
        role: created.role,
        adminPermissions,
      },
    });

    return created;
  },

  async updateAdminAccess(auth, userId, payload) {
    if (auth.role !== "SUPER_ADMIN") {
      throw new AppError(403, "Only super admin can update admin access");
    }

    const actorId = getAuthUserId(auth);
    if (actorId === userId && payload.role && payload.role !== "SUPER_ADMIN") {
      throw new AppError(400, "Super admin cannot demote their own account");
    }

    const target = await adminRepository.findUserById(userId);
    if (!target) {
      throw new AppError(404, "User not found");
    }

    const role = payload.role ?? target.role;
    const adminPermissions =
      Object.prototype.hasOwnProperty.call(payload, "adminPermissions")
        ? normalizeAdminPermissions(payload.adminPermissions)
        : target.adminPermissions;

    const updated = await adminRepository.updateAdminAccess(userId, {
      role,
      adminPermissions: role === "ADMIN" ? adminPermissions : null,
    });

    await adminRepository.createAdminActionLog({
      adminId: actorId,
      action: "UPDATE_ADMIN_ACCESS",
      entityType: "USER",
      entityId: String(userId),
      summary: `Updated admin access for ${updated.email}`,
      payload: {
        role,
        adminPermissions: role === "ADMIN" ? adminPermissions : null,
      },
    });

    return updated;
  },

  async removeUser(auth, userId) {
    const adminId = getAuthUserId(auth);
    if (adminId === userId) {
      throw new AppError(400, "You cannot remove your own account");
    }

    const user = await adminRepository.findUserById(userId);
    if (!user) {
      throw new AppError(404, "User not found");
    }

    if (!user.isActive) {
      throw new AppError(409, "User is already removed");
    }

    const removed = await adminRepository.deactivateUserById(userId);

    await adminRepository.createAdminActionLog({
      adminId,
      action: "DEACTIVATE_USER",
      entityType: "USER",
      entityId: String(userId),
      summary: `Removed user ${user.email}`,
      payload: {
        userId,
        email: user.email,
      },
    });

    return removed;
  },

  async setUserLeaderboardVisibility(auth, userId, isVisible) {
    const adminId = getAuthUserId(auth);
    const user = await adminRepository.findUserById(userId);
    if (!user) {
      throw new AppError(404, "User not found");
    }

    if (!user.isActive) {
      throw new AppError(409, "User is not active");
    }

    const updated = await adminRepository.updateUserLeaderboardVisibility(userId, isVisible);

    await adminRepository.createAdminActionLog({
      adminId,
      action: "UPDATE_LEADERBOARD_VISIBILITY",
      entityType: "USER",
      entityId: String(userId),
      summary: `${isVisible ? "Revealed" : "Hidden"} user ${user.email} on leaderboard`,
      payload: {
        userId,
        isLeaderboardVisible: isVisible,
      },
    });

    return updated;
  },

  async removeUserAvatar(auth, userId) {
    const adminId = getAuthUserId(auth);
    const user = await adminRepository.findUserById(userId);
    if (!user) {
      throw new AppError(404, "User not found");
    }

    if (!user.isActive) {
      throw new AppError(409, "User is not active");
    }

    const updated = await adminRepository.clearUserAvatar(userId);

    await adminRepository.createAdminActionLog({
      adminId,
      action: "REMOVE_USER_AVATAR",
      entityType: "USER",
      entityId: String(userId),
      summary: `Removed profile photo for ${user.email}`,
      payload: {
        userId,
      },
    });

    return updated;
  },

  async listUserActivities(_auth, userId, query) {
    const user = await adminRepository.findUserById(userId);
    if (!user) {
      throw new AppError(404, "User not found");
    }

    const rows = await adminRepository.listUserActivitiesForAdmin(userId, query.limit);
    const enrichedRows = await enrichDailyQuestionAnswerType(rows);
    return attachCompetitionDateToActivities(enrichedRows);
  },

  async createManualAdjustment(auth, payload) {
    const adminId = getAuthUserId(auth);

    const activity = await adminRepository.createManualAdjustment(
      payload,
      adminId,
      env.appTimezone
    );

    await adminRepository.createAdminActionLog({
      adminId,
      action: "MANUAL_POINT_ADJUSTMENT",
      entityType: "USER",
      entityId: String(payload.userId),
      summary: `Adjusted user points by ${payload.points}`,
      payload,
    });

    return activity;
  },

  async createNotificationCampaign(auth, payload) {
    const adminId = getAuthUserId(auth);

    const filters = payload.filters || { tagIds: [], userIds: [] };
    const filterTagIds = filters.tagIds || [];
    const filterUserIds = filters.userIds || [];

    if (payload.targetType === "TAGS" && filterTagIds.length === 0) {
      throw new AppError(400, "tagIds is required for TAGS targetType");
    }

    if (payload.targetType === "USER_IDS" && filterUserIds.length === 0) {
      throw new AppError(400, "userIds is required for USER_IDS targetType");
    }

    const tagIds = Array.from(new Set(filterTagIds));
    const userIds = Array.from(new Set(filterUserIds));

    const [tags, users] = await Promise.all([
      tagIds.length > 0 ? adminRepository.listTagsByIds(tagIds) : [],
      userIds.length > 0 ? adminRepository.listUsersByIds(userIds) : [],
    ]);

    if (tagIds.length > 0) {
      assertResolvedIds(tagIds, tags.map((tag) => tag.id), "tag");
    }

    if (userIds.length > 0) {
      assertResolvedIds(userIds, users.map((user) => user.id), "user");
    }

    let recipientUserIds = [];
    if (payload.targetType === "ALL_USERS") {
      const rows = await adminRepository.listAllActiveUsers();
      recipientUserIds = rows.map((row) => row.id);
    } else if (payload.targetType === "TAGS") {
      const rows = await adminRepository.listUserIdsByTagIds(tagIds);
      recipientUserIds = rows.map((row) => row.userId);
    } else if (payload.targetType === "USER_IDS") {
      recipientUserIds = userIds;
    }

    const campaign = await adminRepository.createNotificationCampaign(
      {
        title: payload.title,
        body: payload.body,
        targetType: payload.targetType,
        filters: {
          tagIds,
          userIds,
          isAnnouncement: Boolean(payload.isAnnouncement),
        },
        targetTagIds: tagIds,
      },
      adminId
    );

    await adminRepository.createNotificationRecipients(campaign.id, recipientUserIds);

    await adminRepository.createAdminActionLog({
      adminId,
      action: "CREATE_NOTIFICATION_CAMPAIGN",
      entityType: "NOTIFICATION_CAMPAIGN",
      entityId: String(campaign.id),
      summary: `Created notification campaign ${campaign.title}`,
      payload,
    });

    return campaign;
  },

  async deleteNotificationCampaign(auth, campaignId) {
    const adminId = getAuthUserId(auth);
    const campaign = await adminRepository.findNotificationCampaignById(campaignId);
    if (!campaign) {
      throw new AppError(404, "Notification campaign not found");
    }

    const deleted = await adminRepository.deleteNotificationCampaignById(campaignId);

    await adminRepository.createAdminActionLog({
      adminId,
      action: "DELETE_NOTIFICATION_CAMPAIGN",
      entityType: "NOTIFICATION_CAMPAIGN",
      entityId: String(campaignId),
      summary: `Deleted notification campaign ${campaign.title}`,
      payload: deleted,
    });

    return deleted;
  },

  async createDailyQuestion(auth, payload) {
    const adminId = getAuthUserId(auth);
    const normalized = normalizeDailyQuestionPayload(payload);

    let question;
    try {
      question = await adminRepository.createDailyQuestion(
        {
          questionText: normalized.questionText,
          answerType: normalized.answerType,
          options: normalized.options,
          correctAnswer: normalized.correctAnswer,
          points: normalized.points,
          activeDate: normalized.activeDate,
          isActive: normalized.isActive,
        },
        adminId
      );
    } catch (error) {
      if (error?.code === "P2002") {
        throw new AppError(409, "A daily question already exists for this day");
      }
      throw error;
    }

    await adminRepository.createAdminActionLog({
      adminId,
      action: "CREATE_DAILY_QUESTION",
      entityType: "DAILY_QUESTION",
      entityId: String(question.id),
      summary: `Created daily question for ${payload.activeDate}`,
      payload,
    });

    return question;
  },

  listDailyQuestions(_auth, query) {
    return adminRepository.listDailyQuestions(query.limit);
  },

  async listDailyQuestionSuggestions(_auth, query) {
    const aiSettings = await readAiAssistSettings();
    const styleRows = await adminRepository.listDailyQuestions(80);
    const styleProfile = buildDailyQuestionStyleProfile(styleRows);

    let rawSuggestions;
    try {
      rawSuggestions = await fetchIslamicDailyQuestionSuggestions(
        query.answerType,
        Math.max(query.limit * 3, 12),
        query.topic,
        query.difficulty
      );
    } catch (error) {
      rawSuggestions = [];
    }

    const finalized = [];
    for (const suggestion of rawSuggestions) {
      if (finalized.length >= query.limit) {
        break;
      }

      const rewritten = await maybeRewriteSuggestionWithAi(aiSettings, {
        answerType: query.answerType,
        topic: query.topic,
        difficulty: query.difficulty,
        styleProfile,
        suggestion,
      });
      const normalized = normalizeSuggestionObject(
        rewritten,
        query.answerType,
        suggestion
      );
      if (!normalized) {
        continue;
      }

      const matchesTopic = !query.topic || query.topic === "ANY" || normalized.topic === query.topic;
      const matchesDifficulty =
        !query.difficulty || query.difficulty === "ANY" || normalized.difficulty === query.difficulty;
      if (!matchesTopic || !matchesDifficulty) {
        continue;
      }

      finalized.push(normalized);
    }

    if (finalized.length < query.limit && aiSettings.enabled) {
      const needed = query.limit - finalized.length;
      for (let index = 0; index < needed; index += 1) {
        try {
          const generated = await generateDailyQuestionSuggestionWithAi(aiSettings, {
            answerType: query.answerType,
            topic: query.topic,
            difficulty: query.difficulty,
            styleProfile,
          });
          const normalized = normalizeSuggestionObject(
            generated,
            query.answerType,
            generated || {}
          );
          if (!normalized) {
            continue;
          }
          const uniqueKey = `${normalized.answerType}|${normalizeQuestionKey(normalized.questionText)}`;
          const exists = finalized.some(
            (row) => `${row.answerType}|${normalizeQuestionKey(row.questionText)}` === uniqueKey
          );
          if (!exists) {
            finalized.push(normalized);
          }
        } catch {
          // ignore AI errors and continue
        }
        if (finalized.length >= query.limit) {
          break;
        }
      }
    }

    return finalized.slice(0, query.limit);
  },

  async generateMotivationNotifications(auth, payload) {
    const adminId = getAuthUserId(auth);
    const aiSettings = await readAiAssistSettings();
    const users = await adminRepository.listActiveParticipantUsers(payload.limitUsers);
    if (users.length === 0) {
      return {
        generatedAt: new Date().toISOString(),
        usersAnalyzed: 0,
        notificationsCreated: 0,
        dryRun: payload.dryRun,
        reports: [],
      };
    }

    const now = new Date();
    const fromDate = new Date(
      now.getTime() - payload.lookbackDays * 24 * 60 * 60 * 1000
    );
    const userIds = users.map((user) => user.id);
    const activityRows = await adminRepository.listTaskCompletionActivitiesForUsers(
      userIds,
      fromDate
    );

    const activityByUserId = new Map();
    for (const activity of activityRows) {
      if (!activityByUserId.has(activity.userId)) {
        activityByUserId.set(activity.userId, []);
      }
      activityByUserId.get(activity.userId).push(activity);
    }

    const reports = [];
    let notificationsCreated = 0;
    for (const user of users) {
      const report = buildMotivationReportForUser(
        user,
        activityByUserId.get(user.id) || [],
        payload.lookbackDays
      );
      const message = await maybeGenerateMotivationMessageWithAi(aiSettings, report);
      const reportWithMessage = {
        ...report,
        title: message.title,
        body: message.body,
      };
      reports.push(reportWithMessage);

      if (!payload.dryRun) {
        const campaign = await adminRepository.createNotificationCampaign(
          {
            title: reportWithMessage.title,
            body: reportWithMessage.body,
            targetType: "USER_IDS",
            filters: {
              tagIds: [],
              userIds: [user.id],
              isAnnouncement: false,
            },
            targetTagIds: [],
          },
          adminId
        );
        const createdRecipients = await adminRepository.createNotificationRecipients(
          campaign.id,
          [user.id]
        );
        notificationsCreated += Number(createdRecipients?.count || 0);
      }
    }

    await adminRepository.createAdminActionLog({
      adminId,
      action: "GENERATE_MOTIVATION_NOTIFICATIONS",
      entityType: "NOTIFICATION_CAMPAIGN",
      summary: payload.dryRun
        ? `Generated ${reports.length} motivation reports (dry run)`
        : `Generated ${reports.length} reports and ${notificationsCreated} motivation notifications`,
      payload: {
        lookbackDays: payload.lookbackDays,
        usersAnalyzed: reports.length,
        notificationsCreated,
        dryRun: payload.dryRun,
      },
    });

    return {
      generatedAt: now.toISOString(),
      usersAnalyzed: reports.length,
      notificationsCreated,
      dryRun: payload.dryRun,
      reports,
    };
  },

  async updateDailyQuestion(auth, questionId, payload) {
    const adminId = getAuthUserId(auth);
    const existing = await adminRepository.findDailyQuestionById(questionId);
    if (!existing) {
      throw new AppError(404, "Daily question not found");
    }

    const hasUpdates = Object.keys(payload).length > 0;
    if (!hasUpdates) {
      throw new AppError(400, "No updates provided");
    }

    const mergedPayload = {
      questionText: payload.questionText ?? existing.questionText,
      answerType: payload.answerType ?? existing.answerType,
      options: payload.options !== undefined ? payload.options : existing.options,
      correctAnswer:
        payload.correctAnswer !== undefined ? payload.correctAnswer : existing.correctAnswer,
      answerExplanation:
        payload.answerExplanation !== undefined
          ? payload.answerExplanation
          : unpackCorrectAnswerExplanation(existing.correctAnswer),
      points: payload.points ?? Number(existing.points),
      activeDate: payload.activeDate ?? toAppDateString(existing.activeDate),
      isActive: payload.isActive ?? existing.isActive,
    };

    const normalized = normalizeDailyQuestionPayload(mergedPayload);
    let updated;
    try {
      updated = await adminRepository.updateDailyQuestionById(questionId, {
        questionText: normalized.questionText,
        answerType: normalized.answerType,
        options: normalized.options,
        correctAnswer: normalized.correctAnswer,
        points: normalized.points,
        activeDate: normalized.activeDate,
        isActive: normalized.isActive,
      });
    } catch (error) {
      if (error?.code === "P2002") {
        throw new AppError(409, "A daily question already exists for this day");
      }
      throw error;
    }

    const shouldRecalculateAnswers =
      normalized.answerType !== "TEXT" &&
      (payload.correctAnswer !== undefined ||
        payload.options !== undefined ||
        payload.answerType !== undefined ||
        payload.points !== undefined);

    if (shouldRecalculateAnswers) {
      const answers = await adminRepository.listDailyQuestionAnswersForRecalculation(questionId);
      const updates = answers
        .map((answer) => {
          const nextIsCorrect = evaluateDailyQuestionAnswer(updated, answer.answer);
          const nextAwardedPoints = nextIsCorrect === true ? Number(updated.points) : 0;
          const previousAwardedPoints = Number(answer.awardedPoints);
          const previousIsCorrect = answer.isCorrect;

          const isChanged =
            previousIsCorrect !== nextIsCorrect ||
            Number(previousAwardedPoints.toFixed(2)) !== Number(nextAwardedPoints.toFixed(2));

          if (!isChanged) {
            return null;
          }

          return {
            answerId: answer.id,
            userId: answer.userId,
            isRevealed: answer.isRevealed,
            previousAwardedPoints,
            nextAwardedPoints,
            nextIsCorrect,
          };
        })
        .filter(Boolean);

      if (updates.length > 0) {
        await adminRepository.recalculateDailyQuestionAnswers(
          questionId,
          updated.questionText,
          updated.answerType,
          updates,
          env.appTimezone
        );
      }
    }

    await adminRepository.createAdminActionLog({
      adminId,
      action: "UPDATE_DAILY_QUESTION",
      entityType: "DAILY_QUESTION",
      entityId: String(questionId),
      summary: `Updated daily question #${questionId}`,
      payload,
    });

    return updated;
  },

  async deleteDailyQuestion(auth, questionId) {
    const adminId = getAuthUserId(auth);
    const existing = await adminRepository.findDailyQuestionById(questionId);
    if (!existing) {
      throw new AppError(404, "Daily question not found");
    }

    const deleted = await adminRepository.deleteDailyQuestionById(questionId);

    await adminRepository.createAdminActionLog({
      adminId,
      action: "DELETE_DAILY_QUESTION",
      entityType: "DAILY_QUESTION",
      entityId: String(questionId),
      summary: `Deleted daily question #${questionId}`,
      payload: deleted,
    });

    return deleted;
  },

  async listDailyQuestionAnswers(_auth, questionId, query) {
    const question = await adminRepository.findDailyQuestionById(questionId);
    if (!question) {
      throw new AppError(404, "Daily question not found");
    }

    return adminRepository.listDailyQuestionAnswers(questionId, query.limit);
  },

  async reviewDailyQuestionAnswer(auth, answerId, payload) {
    const adminId = getAuthUserId(auth);
    const answer = await adminRepository.findDailyQuestionAnswerById(answerId);
    if (!answer) {
      throw new AppError(404, "Daily answer not found");
    }

    if (answer.question.answerType !== "TEXT") {
      throw new AppError(400, "Manual review is allowed only for TEXT answers");
    }

    const awardedPoints =
      payload.awardedPoints !== undefined
        ? payload.awardedPoints
        : payload.isCorrect
          ? Number(answer.question.points)
          : 0;

    const reviewed = await adminRepository.reviewDailyQuestionAnswer(answerId, {
      isCorrect: payload.isCorrect,
      awardedPoints,
    });

    if (answer.isRevealed) {
      const previousAwardedPoints = Number(answer.awardedPoints);
      const deltaPoints = Number((awardedPoints - previousAwardedPoints).toFixed(2));
      if (deltaPoints !== 0) {
        await adminRepository.createDailyQuestionReviewAdjustmentActivity({
          userId: answer.userId,
          questionId: answer.questionId,
          answerId,
          questionText: answer.question.questionText,
          answerType: answer.question.answerType,
          previousAwardedPoints,
          nextAwardedPoints: awardedPoints,
          deltaPoints,
          isCorrect: payload.isCorrect,
          occurredAt: new Date(),
          timezone: env.appTimezone,
        });
      }
    }

    await adminRepository.createAdminActionLog({
      adminId,
      action: "REVIEW_DAILY_QUESTION_ANSWER",
      entityType: "DAILY_QUESTION_ANSWER",
      entityId: String(answerId),
      summary: `Reviewed answer #${answerId}`,
      payload: {
        isCorrect: payload.isCorrect,
        awardedPoints,
      },
    });

    return reviewed;
  },

  async revealDailyQuestionAnswers(auth) {
    const adminId = getAuthUserId(auth);
    const { dateString, dateOnly } = await resolveCompetitionDateByFajr(new Date());

    const question = await adminRepository.findDailyQuestionByDate(dateOnly);
    if (!question) {
      throw new AppError(404, "Daily question not found");
    }

    const revealedAt = new Date();
    const result = await adminRepository.revealDailyQuestionAnswers(
      question.id,
      revealedAt,
      env.appTimezone
    );

    await adminRepository.createAdminActionLog({
      adminId,
      action: "REVEAL_DAILY_QUESTION",
      entityType: "DAILY_QUESTION",
      entityId: String(question.id),
      summary: `Revealed daily question answers for ${dateString}`,
      payload: {
        questionId: question.id,
        revealedAt,
        revealedCount: result.revealedCount,
      },
    });

    return {
      questionId: question.id,
      revealedAt,
      revealedCount: result.revealedCount,
    };
  },

  async getLeaderboard(_auth, query) {
    const rows = await adminRepository.getLeaderboardRows(query.limit);

    return rows.map((row, index) => ({
      rank: index + 1,
      user: row.user,
      totalPoints: row.totalPoints,
      publicPoints: Math.max(0, row.totalPoints),
    }));
  },

  async listNotificationCampaigns(_auth, query) {
    return adminRepository.listNotificationCampaigns(query.limit);
  },

  async getScoringSettings(_auth) {
    const row = await adminRepository.getAppSetting(SCORING_MULTIPLIER_SETTING_KEY);
    return normalizeScoringSettingsValue(row?.value);
  },

  async updateScoringSettings(auth, payload) {
    const adminId = getAuthUserId(auth);
    const value = {
      value: Number(payload.multiplierValue.toFixed(2)),
      applyDuring: payload.applyDuring,
    };

    const updated = await adminRepository.upsertAppSetting(
      SCORING_MULTIPLIER_SETTING_KEY,
      value
    );

    await adminRepository.createAdminActionLog({
      adminId,
      action: "UPDATE_SCORING_SETTINGS",
      entityType: "APP_SETTING",
      entityId: SCORING_MULTIPLIER_SETTING_KEY,
      summary: `Updated scoring multiplier to ${value.value} on ${value.applyDuring}`,
      payload: value,
    });

    return normalizeScoringSettingsValue(updated?.value);
  },

  async getAiAssistSettings(_auth) {
    return readAiAssistSettings();
  },

  async updateAiAssistSettings(auth, payload) {
    const adminId = getAuthUserId(auth);
    const current = await readAiAssistSettings();
    const merged = normalizeAiAssistSettingsValue({
      ...current,
      ...payload,
    });

    const updated = await adminRepository.upsertAppSetting(
      AI_ASSIST_SETTINGS_KEY,
      merged
    );

    await adminRepository.createAdminActionLog({
      adminId,
      action: "UPDATE_AI_ASSIST_SETTINGS",
      entityType: "APP_SETTING",
      entityId: AI_ASSIST_SETTINGS_KEY,
      summary: `Updated AI assistant settings (enabled: ${merged.enabled})`,
      payload: {
        enabled: merged.enabled,
        baseUrl: merged.baseUrl,
        model: merged.model,
        timeoutMs: merged.timeoutMs,
      },
    });

    return normalizeAiAssistSettingsValue(updated?.value);
  },
};
