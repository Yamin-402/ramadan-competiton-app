import { AppError } from "../../core/errors/app-error.js";
import { getAuthUserId } from "../../core/utils/get-auth-user-id.js";
import { toAppDateString, toDateOnly } from "../../core/utils/timezone.js";
import { streaksRepository } from "./streaks.repository.js";
import { isStreakEnabledTask } from "./streaks.utils.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const FULL_REWARD_MULTIPLIER = 1;
const GRACE_REWARD_MULTIPLIER = 0.7;

function toDayIndex(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

function dayGap(newerDateString, olderDateString) {
  return toDayIndex(newerDateString) - toDayIndex(olderDateString);
}

function toUniqueDateStrings(activityRows) {
  const seen = new Set();
  const values = [];

  for (const row of activityRows) {
    const dateString = toAppDateString(row.occurredAt);
    if (seen.has(dateString)) {
      continue;
    }

    seen.add(dateString);
    values.push(dateString);
  }

  return values;
}

function calculateCurrentStreak(dateStrings) {
  if (dateStrings.length === 0) {
    return {
      currentStreak: 0,
      graceDaysUsed: 0,
      rewardMultiplier: FULL_REWARD_MULTIPLIER,
      lastActivityDateString: null,
    };
  }

  let currentStreak = 1;
  let graceDaysUsed = 0;

  for (let i = 0; i < dateStrings.length - 1; i += 1) {
    const gap = dayGap(dateStrings[i], dateStrings[i + 1]);

    if (gap === 1) {
      currentStreak += 1;
      continue;
    }

    if (gap === 2 && graceDaysUsed === 0) {
      graceDaysUsed = 1;
      currentStreak += 1;
      continue;
    }

    break;
  }

  const latestGap = dateStrings.length > 1 ? dayGap(dateStrings[0], dateStrings[1]) : 1;
  const rewardMultiplier =
    latestGap === 2 ? GRACE_REWARD_MULTIPLIER : FULL_REWARD_MULTIPLIER;

  return {
    currentStreak,
    graceDaysUsed,
    rewardMultiplier,
    lastActivityDateString: dateStrings[0],
  };
}

function calculateLongestStreak(dateStrings) {
  if (dateStrings.length === 0) {
    return 0;
  }

  let longestStreak = 1;
  let start = 0;
  let graceCount = 0;

  for (let end = 1; end < dateStrings.length; end += 1) {
    const gap = dayGap(dateStrings[end - 1], dateStrings[end]);

    if (gap > 2) {
      start = end;
      graceCount = 0;
      continue;
    }

    if (gap === 2) {
      graceCount += 1;
    }

    while (graceCount > 1 && start < end) {
      const startGap = dayGap(dateStrings[start], dateStrings[start + 1]);
      if (startGap === 2) {
        graceCount -= 1;
      }
      start += 1;
    }

    const windowSize = end - start + 1;
    if (windowSize > longestStreak) {
      longestStreak = windowSize;
    }
  }

  return longestStreak;
}

function computeStreakMetricsFromDateStrings(dateStrings) {
  const currentMetrics = calculateCurrentStreak(dateStrings);
  const longestStreak = calculateLongestStreak(dateStrings);

  return {
    currentStreak: currentMetrics.currentStreak,
    longestStreak,
    graceDaysUsed: currentMetrics.graceDaysUsed,
    rewardMultiplier: currentMetrics.rewardMultiplier,
    lastActivityDateString: currentMetrics.lastActivityDateString,
  };
}

function mapStreakRow(row) {
  return {
    id: row.id,
    userId: row.userId,
    taskId: row.taskId,
    task: row.task
      ? {
          id: row.task.id,
          key: row.task.key,
          title: row.task.title,
          type: row.task.type,
          status: row.task.status,
        }
      : null,
    currentStreak: row.currentStreak,
    longestStreak: row.longestStreak,
    graceDaysUsed: row.graceDaysUsed,
    rewardMultiplier: Number(row.rewardMultiplier),
    lastActivityDate: row.lastActivityDate,
    lastEvaluatedAt: row.lastEvaluatedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function assertStreakTaskExists(taskId) {
  const task = await streaksRepository.findStreakTaskById(taskId);
  if (!task) {
    throw new AppError(400, "Streak is not enabled for this task");
  }
}

async function loadTaskDateStrings(userId, taskId) {
  const activityRows = await streaksRepository.listActivityDatesForTask(userId, taskId);
  return toUniqueDateStrings(activityRows);
}

export const streaksService = {
  async evaluateUserTask(userId, taskId) {
    await assertStreakTaskExists(taskId);

    const dateStrings = await loadTaskDateStrings(userId, taskId);
    const metrics = computeStreakMetricsFromDateStrings(dateStrings);

    const row = await streaksRepository.upsertStreak({
      userId,
      taskId,
      currentStreak: metrics.currentStreak,
      longestStreak: metrics.longestStreak,
      graceDaysUsed: metrics.graceDaysUsed,
      rewardMultiplier: metrics.rewardMultiplier,
      lastActivityDate: metrics.lastActivityDateString
        ? toDateOnly(metrics.lastActivityDateString)
        : null,
      lastEvaluatedAt: new Date(),
    });

    return mapStreakRow(row);
  },

  async getCurrentStreak(userId, taskId) {
    await assertStreakTaskExists(taskId);

    const row = await streaksRepository.findStreakByUserAndTask(userId, taskId);
    if (row) {
      return row.currentStreak;
    }

    const evaluated = await this.evaluateUserTask(userId, taskId);
    return evaluated.currentStreak;
  },

  async getRewardMultiplierForNewActivity(userId, taskId, occurredAt) {
    await assertStreakTaskExists(taskId);

    const dateStrings = await loadTaskDateStrings(userId, taskId);
    if (dateStrings.length === 0) {
      return FULL_REWARD_MULTIPLIER;
    }

    const newDateString = toAppDateString(occurredAt);
    if (dateStrings.includes(newDateString)) {
      return FULL_REWARD_MULTIPLIER;
    }

    const latestDateString = dateStrings[0];
    const gapFromLatest = dayGap(newDateString, latestDateString);

    if (gapFromLatest !== 2) {
      return FULL_REWARD_MULTIPLIER;
    }

    const currentMetrics = calculateCurrentStreak(dateStrings);
    if (currentMetrics.graceDaysUsed > 0) {
      return FULL_REWARD_MULTIPLIER;
    }

    return GRACE_REWARD_MULTIPLIER;
  },

  async evaluateMyStreaks(auth, payload) {
    const userId = getAuthUserId(auth);

    if (payload.taskId) {
      const result = await this.evaluateUserTask(userId, payload.taskId);
      return [result];
    }

    const taskIds = await streaksRepository.listEvaluableStreakTaskIds(userId);
    if (taskIds.length === 0) {
      return [];
    }

    const rows = [];
    for (const taskId of taskIds) {
      const row = await this.evaluateUserTask(userId, taskId);
      rows.push(row);
    }

    return rows;
  },

  async getMyStreaks(auth) {
    const userId = getAuthUserId(auth);
    const rows = await streaksRepository.listMyStreaks(userId);

    return rows.filter((row) => isStreakEnabledTask(row.task)).map(mapStreakRow);
  },
};
