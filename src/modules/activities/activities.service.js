import { AppError } from "../../core/errors/app-error.js";
import { env } from "../../core/config/env.js";
import { getAuthUserId } from "../../core/utils/get-auth-user-id.js";
import { toAppDateString, toDateOnly } from "../../core/utils/timezone.js";
import {
  getOrCreateFastingWindow,
  isDuringFastingTime,
} from "../../integrations/prayer-times/prayer-time.service.js";
import { activitiesRepository } from "./activities.repository.js";
import { streaksService } from "../streaks/streaks.service.js";
import { isStreakEnabledTask } from "../streaks/streaks.utils.js";

function isCounterTask(task) {
  if (task.type === "COUNTER") {
    return true;
  }

  const flowType = configString(task, "taskFlowType")?.toUpperCase();
  return flowType === "COUNTER" || flowType === "TIMED";
}

function isTimedTask(task) {
  return configString(task, "taskFlowType")?.toUpperCase() === "TIMED";
}

function configBoolean(task, key) {
  const config = task?.config;
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return false;
  }

  const value = config[key];
  if (value === true) {
    return true;
  }
  if (typeof value === "string") {
    return value.trim().toLowerCase() === "true";
  }

  return false;
}

function configString(task, key) {
  const config = task?.config;
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return null;
  }

  const value = config[key];
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function configPositiveInteger(task, key) {
  const config = task?.config;
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return null;
  }

  const raw = config[key];
  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Math.floor(value);
}

function configPositiveNumber(task, key) {
  const config = task?.config;
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return null;
  }

  const raw = config[key];
  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value;
}

function getConfigObject(task) {
  const config = task?.config;
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return null;
  }

  return config;
}

function parsePositiveIdArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0)
    )
  );
}

function parseConditionalRewardTiers(task) {
  const config = getConfigObject(task);
  if (!config) {
    return [];
  }

  const raw = config.conditionalRewardTiers;
  if (!Array.isArray(raw)) {
    return [];
  }

  const tiers = raw
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }

      const requiredCount = Math.floor(Number(item.requiredCount));
      const points = Number(item.points);
      const requiredTaskIds = parsePositiveIdArray(item.requiredTaskIds);

      if (!Number.isFinite(requiredCount) || requiredCount <= 0 || !Number.isFinite(points)) {
        return null;
      }

      return {
        requiredCount,
        points,
        requiredTaskIds,
      };
    })
    .filter(Boolean);

  return tiers.sort((left, right) => left.requiredCount - right.requiredCount);
}

function parseConditionalChildConfig(task) {
  const config = getConfigObject(task);
  if (!config) {
    return null;
  }

  const childTaskIds = parsePositiveIdArray(config.conditionalChildTaskIds);
  if (childTaskIds.length === 0) {
    return null;
  }

  const tiers = parseConditionalRewardTiers(task);
  if (tiers.length === 0) {
    return null;
  }

  return {
    childTaskIds,
    tiers,
  };
}

function parseConditionalInlineConfig(task) {
  const config = getConfigObject(task);
  if (!config) {
    return null;
  }

  const rawInlineTasks = Array.isArray(config.conditionalInlineTasks)
    ? config.conditionalInlineTasks
    : [];
  const inlineTasks = rawInlineTasks
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }

      const keyRaw = typeof item.key === "string" ? item.key : String(item.key || "");
      const key = keyRaw.trim().toLowerCase();
      if (!key) {
        return null;
      }

      return {
        key,
        titleEn: typeof item.titleEn === "string" ? item.titleEn.trim() : null,
        titleAr: typeof item.titleAr === "string" ? item.titleAr.trim() : null,
      };
    })
    .filter(Boolean);

  if (inlineTasks.length === 0) {
    return null;
  }

  const rawTiers = Array.isArray(config.conditionalInlineRewardTiers)
    ? config.conditionalInlineRewardTiers
    : [];

  const tiers = rawTiers
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }

      const requiredCount = Math.floor(Number(item.requiredCount));
      const points = Number(item.points);
      if (!Number.isFinite(requiredCount) || requiredCount <= 0 || !Number.isFinite(points)) {
        return null;
      }

      const requiredInlineTaskKeys = Array.isArray(item.requiredInlineTaskKeys)
        ? Array.from(
            new Set(
              item.requiredInlineTaskKeys
                .map((value) => String(value).trim().toLowerCase())
                .filter(Boolean)
            )
          )
        : [];

      return {
        requiredCount,
        points,
        requiredInlineTaskKeys,
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.requiredCount - right.requiredCount);

  if (tiers.length === 0) {
    return null;
  }

  return {
    tasks: inlineTasks,
    tiers,
  };
}

function isConditionalChildAutoAwardTask(task) {
  if (task.type !== "CONDITIONAL") {
    return false;
  }

  return Boolean(parseConditionalChildConfig(task));
}

function resolveStreakBonusConfig(task) {
  if (!isStreakEnabledTask(task)) {
    return null;
  }

  const goalDays = configPositiveInteger(task, "streakGoalDays");
  const bonusPoints = configPositiveNumber(task, "streakBonusPoints");

  if (!goalDays || !bonusPoints) {
    return null;
  }

  const mode = configString(task, "streakBonusMode")?.toUpperCase() || "ONE_TIME";
  const repeatEveryDays = configPositiveInteger(task, "streakRepeatEveryDays") || goalDays;

  return {
    goalDays,
    bonusPoints,
    mode,
    repeatEveryDays,
  };
}

function resolveStreakBonusCycle(currentStreak, bonusConfig) {
  if (currentStreak < bonusConfig.goalDays) {
    return null;
  }

  if (bonusConfig.mode === "RECURRING_SAME") {
    if (currentStreak % bonusConfig.goalDays !== 0) {
      return null;
    }
    return Math.floor(currentStreak / bonusConfig.goalDays);
  }

  if (bonusConfig.mode === "RECURRING_CUSTOM") {
    if (currentStreak === bonusConfig.goalDays) {
      return 1;
    }

    const diff = currentStreak - bonusConfig.goalDays;
    if (diff <= 0 || diff % bonusConfig.repeatEveryDays !== 0) {
      return null;
    }
    return 1 + Math.floor(diff / bonusConfig.repeatEveryDays);
  }

  if (currentStreak === bonusConfig.goalDays) {
    return 1;
  }

  return null;
}

function resolveCompletionLimit(task) {
  const policy = configString(task, "completionPolicy")?.toUpperCase();
  if (policy === "SINGLE") {
    return 1;
  }
  if (policy === "MULTIPLE_UNLIMITED") {
    return Number.POSITIVE_INFINITY;
  }
  if (policy === "MULTIPLE_LIMITED") {
    return configPositiveInteger(task, "maxCompletionsPerCompetitionDay") || 1;
  }

  const explicitMax = configPositiveInteger(task, "maxCompletionsPerCompetitionDay");
  if (explicitMax) {
    return explicitMax;
  }

  if (
    configBoolean(task, "allowMultipleCompletionsPerCompetitionDay") ||
    configBoolean(task, "allowMultiplePerDay") ||
    configBoolean(task, "allowMultipleCompletions")
  ) {
    return Number.POSITIVE_INFINITY;
  }

  if (isCounterTask(task)) {
    return Number.POSITIVE_INFINITY;
  }

  return 1;
}

async function resolveCompetitionWindow(occurredAt) {
  const todayWindow = await getOrCreateFastingWindow(occurredAt);
  const competitionDateSource =
    occurredAt < todayWindow.fajrAt ? new Date(occurredAt.getTime() - 24 * 60 * 60 * 1000) : occurredAt;

  const dateString = toAppDateString(competitionDateSource);
  const competitionDate = toDateOnly(dateString);
  const startWindow = await getOrCreateFastingWindow(competitionDateSource);
  const nextDaySource = new Date(competitionDateSource.getTime() + 24 * 60 * 60 * 1000);
  const endWindow = await getOrCreateFastingWindow(nextDaySource);

  return {
    competitionDate,
    windowStart: startWindow.fajrAt,
    windowEnd: endWindow.fajrAt,
  };
}

async function resolveCompetitionDateString(occurredAt) {
  const todayWindow = await getOrCreateFastingWindow(occurredAt);
  const competitionDateSource =
    occurredAt < todayWindow.fajrAt
      ? new Date(occurredAt.getTime() - 24 * 60 * 60 * 1000)
      : occurredAt;

  return toAppDateString(competitionDateSource);
}

async function attachCompetitionDate(rows) {
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

async function assertNotAlreadyCompletedInCompetitionDay(task, userId, occurredAt) {
  const completionLimit = resolveCompletionLimit(task);
  if (!Number.isFinite(completionLimit)) {
    return;
  }

  const { windowStart, windowEnd } = await resolveCompetitionWindow(occurredAt);
  const count = await activitiesRepository.countTaskCompletionsInWindow({
    userId,
    taskId: task.id,
    startAt: windowStart,
    endAt: windowEnd,
  });

  if (count >= completionLimit) {
    throw new AppError(409, "Task already logged for this competition day");
  }
}

function resolvePointUnits(task, payload) {
  if (isTimedTask(task)) {
    if (typeof payload.amount !== "number" || Number.isNaN(payload.amount)) {
      throw new AppError(400, "Timed task requires minutes input");
    }

    if (payload.amount < 0) {
      throw new AppError(400, "Timed task minutes cannot be negative");
    }

    // Timed tasks use points-per-hour while the user enters minutes.
    return payload.amount / 60;
  }

  if (!isCounterTask(task)) {
    return 1;
  }

  if (typeof payload.amount !== "number" || Number.isNaN(payload.amount)) {
    throw new AppError(400, "Counter task requires numeric amount");
  }

  if (payload.amount < 0) {
    throw new AppError(400, "Counter task amount cannot be negative");
  }

  return payload.amount;
}

function compareValues(left, operator, right) {
  switch (operator) {
    case "EQ":
      return left === right;
    case "NEQ":
      return left !== right;
    case "GT":
      return left > right;
    case "GTE":
      return left >= right;
    case "LT":
      return left < right;
    case "LTE":
      return left <= right;
    default:
      return false;
  }
}

function isTaskVisibleForUser(task, userTagSet) {
  if (!task.tagRequirements || task.tagRequirements.length === 0) {
    return true;
  }

  return task.tagRequirements.every((requirement) => userTagSet.has(requirement.tagId));
}

function assertTaskWindow(task, occurredAt) {
  if (task.startsAt && occurredAt < task.startsAt) {
    throw new AppError(400, "Task is not active yet");
  }

  if (task.endsAt && occurredAt > task.endsAt) {
    throw new AppError(400, "Task is expired");
  }
}

async function assertDependencies(userId, dependencies, occurredAt) {
  for (const dependency of dependencies) {
    const since = dependency.withinDays
      ? new Date(occurredAt.getTime() - dependency.withinDays * 24 * 60 * 60 * 1000)
      : null;

    const count = await activitiesRepository.countTaskCompletions({
      userId,
      taskId: dependency.dependsOnTaskId,
      since,
    });

    if (count < dependency.minCompletions) {
      throw new AppError(400, "Task dependency conditions are not met", {
        dependsOnTaskId: dependency.dependsOnTaskId,
        minCompletions: dependency.minCompletions,
        currentCount: count,
      });
    }
  }
}

async function assertConditions(userId, userTagSet, conditions, occurredAt) {
  for (const condition of conditions) {
    let leftValue;

    if (condition.type === "TASK_COMPLETIONS") {
      if (!condition.targetTaskId) {
        throw new AppError(400, "TASK_COMPLETIONS condition requires targetTaskId");
      }

      const since = condition.withinDays
        ? new Date(occurredAt.getTime() - condition.withinDays * 24 * 60 * 60 * 1000)
        : null;

      leftValue = await activitiesRepository.countTaskCompletions({
        userId,
        taskId: condition.targetTaskId,
        since,
      });
    } else if (condition.type === "COUNTER_TOTAL") {
      if (!condition.targetCounterId) {
        throw new AppError(400, "COUNTER_TOTAL condition requires targetCounterId");
      }

      leftValue = await activitiesRepository.sumCounterTotal({
        userId,
        counterId: condition.targetCounterId,
      });
    } else if (condition.type === "TAG_PRESENT") {
      if (!condition.targetTagId) {
        throw new AppError(400, "TAG_PRESENT condition requires targetTagId");
      }

      leftValue = userTagSet.has(condition.targetTagId) ? 1 : 0;
    } else if (condition.type === "STREAK_DAYS") {
      if (!condition.targetTaskId) {
        throw new AppError(400, "STREAK_DAYS condition requires targetTaskId");
      }

      leftValue = await streaksService.getCurrentStreak(userId, condition.targetTaskId);
    } else {
      throw new AppError(400, "Unsupported task condition type", {
        type: condition.type,
      });
    }

    const rightValue = Number(condition.value);

    if (!compareValues(Number(leftValue), condition.operator, rightValue)) {
      throw new AppError(400, "Task conditional rules are not met", {
        conditionId: condition.id,
      });
    }
  }
}

function buildCounterDeltas(task, payload) {
  if (!task.counterRules || task.counterRules.length === 0) {
    return [];
  }

  return task.counterRules.map((rule) => {
    let delta;

    if (rule.valueSource === "FIXED") {
      delta = Number(rule.fixedDelta ?? 0);
    } else {
      if (typeof payload.amount !== "number") {
        throw new AppError(400, "Task requires numeric amount for counter input");
      }

      delta = payload.amount;
    }

    if (!rule.allowNegative && delta < 0) {
      throw new AppError(400, "Counter delta cannot be negative for this task", {
        counterId: rule.counterId,
      });
    }

    return {
      counterId: rule.counterId,
      delta: Number(delta.toFixed(2)),
    };
  });
}

async function maybeCreateStreakBonusActivity({
  userId,
  task,
  occurredAt,
  isDuringFasting,
  fastingMultiplier,
  currentStreak,
}) {
  const bonusConfig = resolveStreakBonusConfig(task);
  if (!bonusConfig) {
    return;
  }

  const cycle = resolveStreakBonusCycle(currentStreak, bonusConfig);
  if (!cycle) {
    return;
  }

  const note = `STREAK_BONUS:${task.id}:${bonusConfig.goalDays}:${cycle}`;
  const existing = await activitiesRepository.findSystemActivityByNote({
    userId,
    taskId: task.id,
    note,
  });

  if (existing) {
    return;
  }

  const basePoints = Number(bonusConfig.bonusPoints.toFixed(2));
  const effectivePoints = Number((basePoints * fastingMultiplier).toFixed(2));

  await activitiesRepository.createSystemActivity({
    userId,
    taskId: task.id,
    occurredAt,
    timezone: env.appTimezone,
    isDuringFasting,
    fastingMultiplier,
    basePoints,
    effectivePoints,
    note,
    metadata: {
      kind: "STREAK_BONUS",
      cycle,
      goalDays: bonusConfig.goalDays,
    },
  });
}

function evaluateConditionalTierPoints(tiers, completedTaskIdsSet, completedCount) {
  let points = 0;

  for (const tier of tiers) {
    if (completedCount < tier.requiredCount) {
      continue;
    }

    if (tier.requiredTaskIds.length > 0) {
      const allRequiredPresent = tier.requiredTaskIds.every((taskId) =>
        completedTaskIdsSet.has(taskId)
      );
      if (!allRequiredPresent) {
        continue;
      }
    }

    if (tier.points > points) {
      points = tier.points;
    }
  }

  return Number(points.toFixed(2));
}

function evaluateInlineTierPoints(tiers, selectedKeysSet, selectedCount) {
  let points = 0;

  for (const tier of tiers) {
    if (selectedCount < tier.requiredCount) {
      continue;
    }

    if (tier.requiredInlineTaskKeys.length > 0) {
      const allRequiredPresent = tier.requiredInlineTaskKeys.every((key) =>
        selectedKeysSet.has(key)
      );
      if (!allRequiredPresent) {
        continue;
      }
    }

    if (tier.points > points) {
      points = tier.points;
    }
  }

  return Number(points.toFixed(2));
}

async function maybeCreateConditionalChildBonusActivities({
  userId,
  sourceTaskId,
  occurredAt,
  userTagSet,
  isDuringFasting,
  fastingMultiplier,
}) {
  const parentTasks = await activitiesRepository.listConditionalTasksByChildTaskId(sourceTaskId);
  if (parentTasks.length === 0) {
    return;
  }

  const { competitionDate, windowStart, windowEnd } = await resolveCompetitionWindow(occurredAt);
  const competitionDateString = toAppDateString(competitionDate);

  for (const parentTask of parentTasks) {
    if (!isTaskVisibleForUser(parentTask, userTagSet)) {
      continue;
    }

    const childConfig = parseConditionalChildConfig(parentTask);
    if (!childConfig || !childConfig.childTaskIds.includes(sourceTaskId)) {
      continue;
    }

    const completedTaskIds = await activitiesRepository.listDistinctCompletedTaskIdsInWindow({
      userId,
      taskIds: childConfig.childTaskIds,
      startAt: windowStart,
      endAt: windowEnd,
    });
    const completedTaskIdsSet = new Set(completedTaskIds);
    const completedCount = completedTaskIdsSet.size;

    const targetPoints = evaluateConditionalTierPoints(
      childConfig.tiers,
      completedTaskIdsSet,
      completedCount
    );

    if (targetPoints <= 0) {
      continue;
    }

    const notePrefix = `CONDITIONAL_CHILD_BONUS:${parentTask.id}:${competitionDateString}:`;
    const awardedPoints = await activitiesRepository.sumSystemActivityPointsByNotePrefix({
      userId,
      taskId: parentTask.id,
      notePrefix,
    });

    const deltaPoints = Number((targetPoints - awardedPoints).toFixed(2));
    if (deltaPoints <= 0) {
      continue;
    }

    const note = `${notePrefix}${targetPoints}`;
    const existing = await activitiesRepository.findSystemActivityByNote({
      userId,
      taskId: parentTask.id,
      note,
    });
    if (existing) {
      continue;
    }

    const effectivePoints = Number((deltaPoints * fastingMultiplier).toFixed(2));
    await activitiesRepository.createSystemActivity({
      userId,
      taskId: parentTask.id,
      occurredAt,
      timezone: env.appTimezone,
      isDuringFasting,
      fastingMultiplier,
      basePoints: deltaPoints,
      effectivePoints,
      note,
      metadata: {
        kind: "CONDITIONAL_CHILD_BONUS",
        competitionDate: competitionDateString,
        completedCount,
        targetPoints,
      },
    });
  }
}

export const activitiesService = {
  async createTaskCompletion(auth, payload) {
    const userId = getAuthUserId(auth);
    const occurredAt = payload.occurredAt ? new Date(payload.occurredAt) : new Date();

    if (Number.isNaN(occurredAt.getTime())) {
      throw new AppError(400, "Invalid occurredAt datetime");
    }

    const task = await activitiesRepository.findTaskById(payload.taskId);
    if (!task || task.status !== "ACTIVE") {
      throw new AppError(404, "Task not found");
    }

    assertTaskWindow(task, occurredAt);

    const userTagIds = await activitiesRepository.findUserTagIds(userId);
    const userTagSet = new Set(userTagIds);

    if (!isTaskVisibleForUser(task, userTagSet)) {
      throw new AppError(403, "Task is not visible for this user");
    }

    await assertDependencies(userId, task.dependencies, occurredAt);
    await assertConditions(userId, userTagSet, task.conditions, occurredAt);

    if (isConditionalChildAutoAwardTask(task)) {
      throw new AppError(400, "This conditional task is auto-awarded from child tasks");
    }

    await assertNotAlreadyCompletedInCompetitionDay(task, userId, occurredAt);

    const isDuringFasting =
      typeof payload.isDuringFasting === "boolean"
        ? payload.isDuringFasting
        : await isDuringFastingTime(occurredAt);
    const fastingMultiplier = isDuringFasting ? 1.5 : 1;
    const shouldApplyStreak = isStreakEnabledTask(task);
    const streakMultiplier = shouldApplyStreak
      ? await streaksService.getRewardMultiplierForNewActivity(userId, task.id, occurredAt)
      : 1;
    const pointUnits = resolvePointUnits(task, payload);
    const activityMetadata =
      payload.metadata && typeof payload.metadata === "object" && !Array.isArray(payload.metadata)
        ? { ...payload.metadata }
        : {};
    const inlineConditionalConfig =
      task.type === "CONDITIONAL" ? parseConditionalInlineConfig(task) : null;

    let basePoints;
    if (inlineConditionalConfig) {
      const selectedInlineTaskKeys = Array.isArray(payload.metadata?.selectedInlineTaskKeys)
        ? Array.from(
            new Set(
              payload.metadata.selectedInlineTaskKeys
                .map((value) => String(value).trim().toLowerCase())
                .filter(Boolean)
            )
          )
        : [];

      const validKeys = new Set(inlineConditionalConfig.tasks.map((item) => item.key));
      const filteredSelectedKeys = selectedInlineTaskKeys.filter((key) => validKeys.has(key));

      if (filteredSelectedKeys.length === 0) {
        throw new AppError(400, "Select at least one minor task before completing this task");
      }

      const selectedKeysSet = new Set(filteredSelectedKeys);
      const inlinePoints = evaluateInlineTierPoints(
        inlineConditionalConfig.tiers,
        selectedKeysSet,
        filteredSelectedKeys.length
      );
      basePoints = Number(inlinePoints.toFixed(2));

      activityMetadata.selectedInlineTaskKeys = filteredSelectedKeys;
      activityMetadata.inlineSelectedCount = filteredSelectedKeys.length;
    } else {
      basePoints = Number((Number(task.basePoints) * pointUnits).toFixed(2));
    }

    if (task.type === "FORBIDDEN") {
      basePoints = -Math.abs(basePoints);
    }
    const effectivePoints = Number((basePoints * fastingMultiplier * streakMultiplier).toFixed(2));

    const counterDeltas = buildCounterDeltas(task, payload);

    const activity = await activitiesRepository.createTaskCompletion({
      userId,
      taskId: task.id,
      occurredAt,
      timezone: env.appTimezone,
      isDuringFasting,
      fastingMultiplier,
      basePoints,
      effectivePoints,
      note: payload.note,
      metadata: {
        ...activityMetadata,
        streakMultiplier,
        pointUnits,
        activityAmount: typeof payload.amount === "number" ? payload.amount : null,
        isDuringFastingOverride: typeof payload.isDuringFasting === "boolean",
      },
      isForbidden: task.type === "FORBIDDEN",
      counterDeltas,
    });

    if (shouldApplyStreak) {
      const evaluatedStreak = await streaksService.evaluateUserTask(userId, task.id);
      await maybeCreateStreakBonusActivity({
        userId,
        task,
        occurredAt,
        isDuringFasting,
        fastingMultiplier,
        currentStreak: evaluatedStreak.currentStreak,
      });
    }

    await maybeCreateConditionalChildBonusActivities({
      userId,
      sourceTaskId: task.id,
      occurredAt,
      userTagSet,
      isDuringFasting,
      fastingMultiplier,
    });

    return activity;
  },

  async listMyActivities(auth, query) {
    const userId = getAuthUserId(auth);
    const rows = await activitiesRepository.listUserActivities(userId, query.limit);
    return attachCompetitionDate(rows);
  },

  async getFastingStatus(_auth, query) {
    const occurredAt = query.occurredAt ? new Date(query.occurredAt) : new Date();

    if (Number.isNaN(occurredAt.getTime())) {
      throw new AppError(400, "Invalid occurredAt datetime");
    }

    const isDuringFasting = await isDuringFastingTime(occurredAt);

    return {
      isDuringFasting,
      occurredAt: occurredAt.toISOString(),
      timezone: env.appTimezone,
    };
  },

  async getTodayTaskStatus(auth, query) {
    const userId = getAuthUserId(auth);
    const occurredAt = query.occurredAt ? new Date(query.occurredAt) : new Date();

    if (Number.isNaN(occurredAt.getTime())) {
      throw new AppError(400, "Invalid occurredAt datetime");
    }

    const { windowStart, windowEnd } = await resolveCompetitionWindow(occurredAt);
    const counts = await activitiesRepository.listTaskCompletionCountsInWindow({
      userId,
      startAt: windowStart,
      endAt: windowEnd,
    });

    return { counts };
  },
};
