import { AppError } from "../../core/errors/app-error.js";
import { env } from "../../core/config/env.js";
import { getAuthUserId } from "../../core/utils/get-auth-user-id.js";
import { generateUserProgressReportWithAi } from "../../integrations/ai-assistant/ai-assistant.client.js";
import { usersRepository } from "./users.repository.js";

const AI_ASSIST_SETTINGS_KEY = "AI_ASSIST_SETTINGS";
const DEFAULT_AI_ASSIST_SETTINGS = {
  enabled: Boolean(env.aiApiKey),
  baseUrl: "https://api.groq.com/openai/v1",
  model: "llama-3.1-8b-instant",
  timeoutMs: 25000,
};

function uniqueKeys(values) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

function isEducationTagKey(key) {
  const normalized = key.trim().toLowerCase();
  return normalized.includes("school") || normalized.includes("university") || normalized.includes("uni");
}

function normalizeAiAssistSettingsValue(value) {
  const raw = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const enabledRaw = raw.enabled;
  const hasEnvKey = Boolean(env.aiApiKey);
  const enabled = hasEnvKey
    ? true
    : enabledRaw === undefined || enabledRaw === null
      ? DEFAULT_AI_ASSIST_SETTINGS.enabled
      : enabledRaw === true || String(enabledRaw || "").trim().toLowerCase() === "true";
  const baseUrl =
    hasEnvKey
      ? DEFAULT_AI_ASSIST_SETTINGS.baseUrl
      : typeof raw.baseUrl === "string" && raw.baseUrl.trim().length > 0
        ? raw.baseUrl.trim().replace(/\/+$/, "")
        : DEFAULT_AI_ASSIST_SETTINGS.baseUrl;
  const model =
    hasEnvKey
      ? DEFAULT_AI_ASSIST_SETTINGS.model
      : typeof raw.model === "string" && raw.model.trim().length > 0
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
  const row = await usersRepository.getAppSetting(AI_ASSIST_SETTINGS_KEY);
  return normalizeAiAssistSettingsValue(row?.value);
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getCairoDateKey(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: env.appTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getCairoWeekday(date, language) {
  const locale = language === "AR" ? "ar-EG" : "en-US";
  return new Intl.DateTimeFormat(locale, {
    timeZone: env.appTimezone,
    weekday: "long",
  }).format(date);
}

function countArabicCharacters(value) {
  const matches = String(value || "").match(/[\u0600-\u06FF]/g);
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

function buildAnalytics(activities, streaks, options) {
  const dayMap = new Map();
  const taskMap = new Map();
  const weekdayMap = new Map();

  let totalPoints = 0;
  let totalActivities = 0;
  let taskCompletionCount = 0;
  let forbiddenCount = 0;
  let fastingCount = 0;
  let iftarCount = 0;
  let dailyQuestionAnswered = 0;
  let dailyQuestionCorrect = 0;
  let manualAdjustmentCount = 0;

  for (const row of activities) {
    const occurredAt = new Date(row.occurredAt);
    const dayKey = row.competitionDate || getCairoDateKey(occurredAt);
    const weekday = getCairoWeekday(occurredAt, options.language);
    const effectivePoints = toNumber(row.effectivePoints);

    totalActivities += 1;
    totalPoints += effectivePoints;
    weekdayMap.set(weekday, (weekdayMap.get(weekday) || 0) + 1);

    const day = dayMap.get(dayKey) || { points: 0, count: 0 };
    day.points += effectivePoints;
    day.count += 1;
    dayMap.set(dayKey, day);

    if (row.type === "TASK_COMPLETION") {
      taskCompletionCount += 1;
      if (row.isForbidden) {
        forbiddenCount += 1;
      }
      if (row.isDuringFasting) {
        fastingCount += 1;
      } else {
        iftarCount += 1;
      }
      const taskTitle = row.task?.title || "Task";
      taskMap.set(taskTitle, (taskMap.get(taskTitle) || 0) + 1);
    }

    if (row.type === "DAILY_QUESTION_ANSWER") {
      dailyQuestionAnswered += 1;
      if (row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)) {
        if (row.metadata.isCorrect === true) {
          dailyQuestionCorrect += 1;
        }
      }
    }

    if (row.type === "MANUAL_ADJUSTMENT") {
      manualAdjustmentCount += 1;
    }
  }

  const dayRows = Array.from(dayMap.entries())
    .map(([dayKey, value]) => ({
      dayKey,
      points: Number(value.points.toFixed(2)),
      count: value.count,
    }))
    .sort((a, b) => a.dayKey.localeCompare(b.dayKey));

  const activeDays = dayRows.length;
  const inactiveDays = Math.max(0, options.lookbackDays - activeDays);
  const averagePointsPerActiveDay =
    activeDays > 0 ? Number((totalPoints / activeDays).toFixed(2)) : 0;
  const bestDay = dayRows.reduce(
    (best, current) => (current.points > best.points ? current : best),
    { dayKey: "-", points: Number.NEGATIVE_INFINITY, count: 0 }
  );
  const weakestDay = dayRows.reduce(
    (worst, current) => (current.points < worst.points ? current : worst),
    { dayKey: "-", points: Number.POSITIVE_INFINITY, count: 0 }
  );

  const topTasks = Array.from(taskMap.entries())
    .map(([taskTitle, count]) => ({ taskTitle, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const weekdayDistribution = Array.from(weekdayMap.entries())
    .map(([weekday, count]) => ({ weekday, count }))
    .sort((a, b) => b.count - a.count);

  const midpoint = Math.ceil(dayRows.length / 2);
  const firstHalf = dayRows.slice(0, midpoint);
  const secondHalf = dayRows.slice(midpoint);
  const firstHalfAvg =
    firstHalf.length > 0
      ? Number(
          (
            firstHalf.reduce((sum, day) => sum + day.points, 0) /
            Math.max(firstHalf.length, 1)
          ).toFixed(2)
        )
      : 0;
  const secondHalfAvg =
    secondHalf.length > 0
      ? Number(
          (
            secondHalf.reduce((sum, day) => sum + day.points, 0) /
            Math.max(secondHalf.length, 1)
          ).toFixed(2)
        )
      : 0;

  const activeStreaks = streaks.filter((row) => row.currentStreak > 0).length;
  const bestCurrentStreak =
    streaks.length > 0 ? Math.max(...streaks.map((row) => row.currentStreak)) : 0;
  const longestStreak =
    streaks.length > 0 ? Math.max(...streaks.map((row) => row.longestStreak)) : 0;

  return {
    totals: {
      lookbackDays: options.lookbackDays,
      totalActivities,
      totalPoints: Number(totalPoints.toFixed(2)),
      taskCompletionCount,
      manualAdjustmentCount,
      activeDays,
      inactiveDays,
      averagePointsPerActiveDay,
    },
    timing: {
      fastingCount,
      iftarCount,
    },
    dailyQuestions: {
      answered: dailyQuestionAnswered,
      correct: dailyQuestionCorrect,
      accuracy:
        dailyQuestionAnswered > 0
          ? Number(((dailyQuestionCorrect / dailyQuestionAnswered) * 100).toFixed(1))
          : 0,
    },
    streaks: {
      activeStreaks,
      bestCurrentStreak,
      longestStreak,
    },
    comparison: {
      firstHalfAveragePoints: firstHalfAvg,
      secondHalfAveragePoints: secondHalfAvg,
      trendDelta: Number((secondHalfAvg - firstHalfAvg).toFixed(2)),
      bestDay:
        bestDay.points === Number.NEGATIVE_INFINITY
          ? null
          : { dayKey: bestDay.dayKey, points: bestDay.points, count: bestDay.count },
      weakestDay:
        weakestDay.points === Number.POSITIVE_INFINITY
          ? null
          : { dayKey: weakestDay.dayKey, points: weakestDay.points, count: weakestDay.count },
    },
    topTasks,
    weekdayDistribution,
    forbiddenCount,
  };
}

function toShortList(items, limit) {
  return items.slice(0, limit);
}

function buildFallbackReport(profile, analytics, options) {
  const isArabic = options.language === "AR";
  const shortName = (profile.displayName || profile.email || "").trim().split(" ")[0] || "";
  const greetingName = shortName ? `${isArabic ? "يا" : ""} ${shortName}`.trim() : "";

  const highlights = [];
  if (analytics.totals.totalActivities > 0) {
    highlights.push(
      isArabic
        ? `أنجزت ${analytics.totals.totalActivities} نشاط في آخر ${analytics.totals.lookbackDays} يوم.`
        : `You completed ${analytics.totals.totalActivities} activities in the last ${analytics.totals.lookbackDays} days.`
    );
  }
  if (options.includeTiming) {
    highlights.push(
      isArabic
        ? `تسجيلات الصيام: ${analytics.timing.fastingCount} | الإفطار: ${analytics.timing.iftarCount}.`
        : `Fasting logs: ${analytics.timing.fastingCount} | Iftar logs: ${analytics.timing.iftarCount}.`
    );
  }
  if (options.includeDailyQuestions) {
    highlights.push(
      isArabic
        ? `إجابات السؤال اليومي: ${analytics.dailyQuestions.answered} بدقة ${analytics.dailyQuestions.accuracy}%.`
        : `Daily questions: ${analytics.dailyQuestions.answered} answered with ${analytics.dailyQuestions.accuracy}% accuracy.`
    );
  }
  if (options.includeTopTasks && analytics.topTasks.length > 0) {
    const top = analytics.topTasks[0];
    highlights.push(
      isArabic
        ? `أكثر مهمة التزمت بها: ${top.taskTitle} (${top.count} مرات).`
        : `Most repeated task: ${top.taskTitle} (${top.count} times).`
    );
  }
  if (options.includeStreaks) {
    highlights.push(
      isArabic
        ? `أفضل استمرارية حالية: ${analytics.streaks.bestCurrentStreak} يوم.`
        : `Best current streak: ${analytics.streaks.bestCurrentStreak} days.`
    );
  }

  const actionPlan = [];
  actionPlan.push(
    isArabic
      ? "ثبت مهمتين أساسيتين يوميًا والتزم بهم في نفس الوقت."
      : "Lock two core daily tasks and keep them at fixed times."
  );
  if (options.focusMode === "COMPARISON" || options.focusMode === "BOTH") {
    actionPlan.push(
      isArabic
        ? "راجع الأيام الضعيفة وابدأ فيها بمهام بسيطة جدًا لرفع المتوسط."
        : "Review weak days and start with very simple tasks to raise your average."
    );
  }
  actionPlan.push(
    isArabic
      ? "استخدم السؤال اليومي كعادة ثابتة قبل نهاية اليوم."
      : "Use the daily question as a fixed habit before day end."
  );

  const title = isArabic
    ? `تقرير تقدمك ${greetingName}`.trim()
    : `Your Progress Report ${greetingName}`.trim();
  const summary = isArabic
    ? `مجموع نقاطك خلال الفترة هو ${analytics.totals.totalPoints} مع نشاط في ${analytics.totals.activeDays} يوم. المتوسط اليومي ${analytics.totals.averagePointsPerActiveDay} نقطة.`
    : `Your total points in this period are ${analytics.totals.totalPoints}, with activity on ${analytics.totals.activeDays} days. Daily average is ${analytics.totals.averagePointsPerActiveDay} points.`;
  const comparison =
    options.focusMode === "SUMMARY"
      ? isArabic
        ? "وضعك الحالي واضح، ركز على الثبات اليومي أكثر من الكمية."
        : "Your current picture is clear; focus on consistency more than volume."
      : isArabic
        ? `متوسط النصف الأول ${analytics.comparison.firstHalfAveragePoints} نقطة مقابل ${analytics.comparison.secondHalfAveragePoints} للنصف الثاني (فرق ${analytics.comparison.trendDelta}).`
        : `First-half average is ${analytics.comparison.firstHalfAveragePoints} points vs ${analytics.comparison.secondHalfAveragePoints} in second half (delta ${analytics.comparison.trendDelta}).`;
  const motivation = isArabic
    ? options.tone === "STRICT"
      ? "النتيجة تتحسن بالالتزام اليومي. قلل التشتت وركز على تنفيذ خطة ثابتة."
      : "مستواك قابل للتحسن بسرعة. خطوة صغيرة ثابتة كل يوم هتفرق جدًا."
    : options.tone === "STRICT"
      ? "Results improve with daily discipline. Reduce distractions and execute a steady plan."
      : "Your level can improve quickly. One small consistent step every day will make a big difference.";

  const lengthLimit = options.reportLength === "SHORT" ? 3 : options.reportLength === "MEDIUM" ? 5 : 8;

  return {
    title,
    summary,
    highlights: toShortList(highlights, lengthLimit),
    comparison,
    actionPlan: toShortList(actionPlan, lengthLimit),
    motivation,
    usedAi: false,
  };
}

function normalizeReportFromAi(raw, fallback, options) {
  const parsed = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const title = String(parsed.title || "").trim();
  const summary = String(parsed.summary || "").trim();
  const highlights = Array.isArray(parsed.highlights)
    ? parsed.highlights.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  const comparison = String(parsed.comparison || "").trim();
  const actionPlan = Array.isArray(parsed.actionPlan)
    ? parsed.actionPlan.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  const motivation = String(parsed.motivation || "").trim();

  if (!title || !summary || highlights.length === 0 || actionPlan.length === 0 || !motivation) {
    return fallback;
  }

  if (options.language === "AR") {
    const mustBeArabic = [title, summary, motivation];
    if (mustBeArabic.some((value) => !looksArabicEnough(value))) {
      return fallback;
    }
  }

  const lengthLimit = options.reportLength === "SHORT" ? 3 : options.reportLength === "MEDIUM" ? 5 : 8;

  return {
    title: title.slice(0, 120),
    summary: summary.slice(0, options.reportLength === "LONG" ? 1200 : options.reportLength === "MEDIUM" ? 800 : 500),
    highlights: toShortList(highlights, lengthLimit),
    comparison: comparison.slice(0, 1000),
    actionPlan: toShortList(actionPlan, lengthLimit),
    motivation: motivation.slice(0, 800),
    usedAi: true,
  };
}

async function maybeGenerateReportWithAi(aiSettings, profile, analytics, options) {
  const fallback = buildFallbackReport(profile, analytics, options);
  if (!aiSettings.enabled) {
    return fallback;
  }

  try {
    const generated = await generateUserProgressReportWithAi(aiSettings, {
      language: options.language,
      reportLength: options.reportLength,
      focusMode: options.focusMode,
      tone: options.tone,
      analytics,
    });
    return normalizeReportFromAi(generated, fallback, options);
  } catch {
    return fallback;
  }
}

export const usersService = {
  async getMyProfile(auth) {
    const userId = getAuthUserId(auth);
    const user = await usersRepository.findById(userId);

    if (!user) {
      throw new AppError(404, "User not found");
    }

    return user;
  },

  async updateMyProfile(auth, payload) {
    const userId = getAuthUserId(auth);
    const hasDisplayName = Object.prototype.hasOwnProperty.call(payload, "displayName");
    const hasBio = Object.prototype.hasOwnProperty.call(payload, "bio");
    const hasAvatarUrl = Object.prototype.hasOwnProperty.call(payload, "avatarUrl");
    const hasStreakVisibility = Object.prototype.hasOwnProperty.call(payload, "isStreakPublic");

    if (!hasDisplayName && !hasBio && !hasAvatarUrl && !hasStreakVisibility) {
      throw new AppError(400, "No profile updates provided");
    }

    const updatedUser = await usersRepository.updateProfile(userId, payload);

    if (!updatedUser) {
      throw new AppError(404, "User not found");
    }

    return updatedUser;
  },

  async getPublicProfile(auth, targetUserId) {
    const viewerUserId = getAuthUserId(auth);
    const profile = await usersRepository.findPublicProfileById(viewerUserId, targetUserId);

    if (!profile) {
      throw new AppError(404, "User not found");
    }

    return profile;
  },

  async updateMyTags(auth, payload) {
    const userId = getAuthUserId(auth);
    const tagKeys = uniqueKeys(payload.tagKeys);

    const availableTags = await usersRepository.findTagsByKeys(tagKeys);
    const availableTagKeySet = new Set(availableTags.map((tag) => tag.key));

    const missingKeys = tagKeys.filter((key) => !availableTagKeySet.has(key));
    if (missingKeys.length > 0) {
      throw new AppError(400, "Unknown tag keys", { missingKeys });
    }

    const hasEducationLevel = availableTags.some((tag) => isEducationTagKey(tag.key));
    if (!hasEducationLevel) {
      throw new AppError(400, "At least one education level tag is required");
    }

    const updatedUser = await usersRepository.replaceUserTags(
      userId,
      availableTags.map((tag) => tag.id)
    );

    if (!updatedUser) {
      throw new AppError(404, "User not found");
    }

    return updatedUser;
  },

  async generateMyAiReport(auth, options) {
    const userId = getAuthUserId(auth);
    const profile = await usersRepository.findById(userId);
    if (!profile) {
      throw new AppError(404, "User not found");
    }

    let activities = [];
    let streaks = [];
    let aiSettings = DEFAULT_AI_ASSIST_SETTINGS;
    try {
      const fromDate = new Date(Date.now() - options.lookbackDays * 24 * 60 * 60 * 1000);
      const [activitiesResult, streaksResult, aiSettingsResult] = await Promise.all([
        usersRepository.listActivitiesForReport(userId, fromDate),
        usersRepository.listStreaksForUser(userId),
        readAiAssistSettings(),
      ]);
      activities = activitiesResult || [];
      streaks = streaksResult || [];
      aiSettings = aiSettingsResult || DEFAULT_AI_ASSIST_SETTINGS;
      if (activities.length === 0) {
        try {
          const fallbackFromDate = profile.createdAt ? new Date(profile.createdAt) : new Date(0);
          activities = await usersRepository.listActivitiesForReport(userId, fallbackFromDate);
        } catch {
          activities = [];
        }
      }
    } catch {
      // fallback to empty analytics if data fetch fails
      activities = [];
      streaks = [];
      aiSettings = DEFAULT_AI_ASSIST_SETTINGS;
    }

    let analytics;
    try {
      analytics = buildAnalytics(activities, streaks, options);
    } catch {
      analytics = buildAnalytics([], [], options);
    }

    const report = await maybeGenerateReportWithAi(aiSettings, profile, analytics, options);

    return {
      generatedAt: new Date().toISOString(),
      options,
      report,
      analytics,
    };
  },
};


