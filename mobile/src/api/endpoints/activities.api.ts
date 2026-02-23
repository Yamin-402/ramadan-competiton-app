import { apiClient, unwrapData } from "../client";
import { Activity } from "../../types/domain";

interface CreateTaskCompletionPayload {
  taskId: number;
  amount?: number;
  note?: string;
  isDuringFasting?: boolean;
  metadata?: Record<string, unknown>;
}

interface FastingStatusResponse {
  isDuringFasting: boolean;
  occurredAt: string;
  timezone: string;
}

interface TodayTaskStatusResponse {
  counts: Array<{
    taskId: number;
    count: number;
  }>;
}

export const activitiesApi = {
  listMine(limit = 40) {
    return unwrapData<Activity[]>(
      apiClient.get("/activities/me", {
        params: { limit },
      })
    );
  },

  createTaskCompletion(payload: CreateTaskCompletionPayload) {
    return unwrapData<Activity>(apiClient.post("/activities/task-completions", payload));
  },

  getFastingStatus(occurredAt?: string) {
    return unwrapData<FastingStatusResponse>(
      apiClient.get("/activities/fasting-status", {
        params: occurredAt ? { occurredAt } : undefined,
      })
    );
  },

  getTodayTaskStatus(occurredAt?: string) {
    return unwrapData<TodayTaskStatusResponse>(
      apiClient.get("/activities/today-task-status", {
        params: occurredAt ? { occurredAt } : undefined,
      })
    );
  },
};
