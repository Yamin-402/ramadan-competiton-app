import { AppError } from "../../core/errors/app-error.js";
import { getAuthUserId } from "../../core/utils/get-auth-user-id.js";
import { toAppDateString, toDateOnly } from "../../core/utils/timezone.js";
import { moneyRepository } from "./money.repository.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function getDayBounds(dateString) {
  const start = toDateOnly(dateString);
  const end = new Date(start.getTime() + DAY_MS - 1);
  return { start, end };
}

function mapFriendlyChoiceToTrigger(taskType, when) {
  if (taskType === "FORBIDDEN") {
    return when === "COMPLETED" ? "DO_FORBIDDEN" : "AVOID_FORBIDDEN";
  }

  return when === "COMPLETED" ? "COMPLETE_TASK" : "MISS_TASK";
}

export const moneyService = {
  async createCommitment(auth, payload) {
    const userId = getAuthUserId(auth);
    const task = await moneyRepository.findTaskById(payload.taskId);

    if (!task) {
      throw new AppError(404, "Task not found");
    }

    const commitment = await moneyRepository.upsertCommitment({
      userId,
      taskId: payload.taskId,
      triggerType: payload.triggerType,
      amount: payload.amount,
      active: payload.active ?? true,
    });

    return commitment;
  },

  async createFriendlyCommitment(auth, payload) {
    const userId = getAuthUserId(auth);
    const task = await moneyRepository.findTaskById(payload.taskId);

    if (!task) {
      throw new AppError(404, "Task not found");
    }

    const triggerType = mapFriendlyChoiceToTrigger(task.type, payload.when);

    const commitment = await moneyRepository.upsertCommitment({
      userId,
      taskId: payload.taskId,
      triggerType,
      amount: payload.amount,
      active: payload.active ?? true,
    });

    return commitment;
  },

  listCommitments(auth, query) {
    const userId = getAuthUserId(auth);
    return moneyRepository.listCommitmentsByUser(userId, query.active);
  },

  async evaluateToday(auth) {
    const userId = getAuthUserId(auth);
    const commitments = await moneyRepository.listActiveCommitmentsByUser(userId);

    if (commitments.length === 0) {
      return { created: 0 };
    }

    const taskIds = commitments.map((commitment) => commitment.taskId);
    const today = toAppDateString(new Date());
    const { start, end } = getDayBounds(today);

    const activityRows = await moneyRepository.listActivitiesForDate(
      userId,
      taskIds,
      start,
      end
    );
    const completedTaskIdSet = new Set();
    const forbiddenTaskIdSet = new Set();

    for (const row of activityRows) {
      if (row.type === "TASK_COMPLETION") {
        completedTaskIdSet.add(row.taskId);
      }

      if (row.isForbidden) {
        forbiddenTaskIdSet.add(row.taskId);
      }
    }

    const entries = commitments
      .filter((commitment) => {
        if (commitment.triggerType === "MISS_TASK") {
          return !completedTaskIdSet.has(commitment.taskId);
        }

        if (commitment.triggerType === "COMPLETE_TASK") {
          return completedTaskIdSet.has(commitment.taskId);
        }

        if (commitment.triggerType === "DO_FORBIDDEN") {
          return forbiddenTaskIdSet.has(commitment.taskId);
        }

        if (commitment.triggerType === "AVOID_FORBIDDEN") {
          return !forbiddenTaskIdSet.has(commitment.taskId);
        }

        return false;
      })
      .map((commitment) => ({
        userId,
        taskId: commitment.taskId,
        triggerType: commitment.triggerType,
        amount: commitment.amount,
        date: toDateOnly(today),
        reason: commitment.triggerType,
      }));

    const result = await moneyRepository.createMoneyEntries(entries);

    return { created: result.count };
  },

  async getSummary(auth, query) {
    const userId = getAuthUserId(auth);
    const [entries, totals, settlementEntries] = await Promise.all([
      moneyRepository.listMoneyEntriesByUser(userId, query.limit),
      moneyRepository.sumMoneyEntriesByUser(userId),
      moneyRepository.listSettlementEntriesByUser(userId, query.limit),
    ]);

    const settlementsByBatch = new Map();
    for (const entry of settlementEntries) {
      const reason = entry.removedReason || "";
      const batchId = reason.startsWith("USER_SETTLED:")
        ? reason.replace("USER_SETTLED:", "").split(":")[0]
        : null;
      if (!batchId) {
        continue;
      }

      const existing = settlementsByBatch.get(batchId) || {
        batchId,
        settledAt: entry.removedAt,
        totalPaid: 0,
        entries: [],
      };
      existing.totalPaid += Number(entry.amount);
      existing.entries.push({
        id: entry.id,
        task: entry.task,
        amount: Number(entry.amount),
        date: entry.date,
      });
      settlementsByBatch.set(batchId, existing);
    }

    const settlements = Array.from(settlementsByBatch.values()).sort(
      (left, right) => new Date(right.settledAt).getTime() - new Date(left.settledAt).getTime()
    );

    return {
      totalAmount: Number(totals._sum.amount || 0),
      entries,
      settlements,
    };
  },

  async removeEntry(auth, id, removedReason) {
    const userId = getAuthUserId(auth);
    const count = await moneyRepository.softDeleteMoneyEntry(userId, id, removedReason);

    if (count === 0) {
      const existing = await moneyRepository.findMoneyEntryById(userId, id);
      if (!existing) {
        throw new AppError(404, "Money entry not found");
      }

      return { removed: false, alreadyRemoved: true };
    }

    return { removed: true };
  },

  async removeCommitment(auth, id) {
    const userId = getAuthUserId(auth);
    const deleted = await moneyRepository.deleteCommitmentById(userId, id);

    if (deleted.count === 0) {
      const existing = await moneyRepository.findCommitmentById(userId, id);
      if (!existing) {
        throw new AppError(404, "Commitment not found");
      }
    }

    return { removed: deleted.count > 0 };
  },

  async clearOutstanding(auth, note) {
    const userId = getAuthUserId(auth);
    const entries = await moneyRepository.listOutstandingEntriesByUser(userId);

    if (entries.length === 0) {
      return {
        cleared: 0,
        totalPaid: 0,
        batchId: null,
      };
    }

    const batchId = `${Date.now()}`;
    const removedReason = `USER_SETTLED:${batchId}${note ? `:${note}` : ""}`;
    const removedAt = new Date();

    await moneyRepository.softDeleteEntriesByIds(
      userId,
      entries.map((entry) => entry.id),
      removedReason,
      removedAt
    );

    const totalPaid = entries.reduce((sum, entry) => sum + Number(entry.amount), 0);

    return {
      cleared: entries.length,
      totalPaid: Number(totalPaid.toFixed(2)),
      batchId,
      settledAt: removedAt.toISOString(),
      tasks: entries.map((entry) => ({
        taskId: entry.taskId,
        taskTitle: entry.task.title,
        amount: Number(entry.amount),
      })),
    };
  },
};
