import {
  AdminAccessUser,
  AdminCounter,
  AdminDailyQuestionAnswer,
  AdminTask,
  AdminTaskCounterRule,
  AdminUserActivity,
  AdminUser,
  DailyQuestionSuggestion,
  DailyQuestionListItem,
  LeaderboardRow,
  NotificationCampaignListItem,
  ScoringSettings,
  TaskCreatePayload,
} from "../types";
import { requestData } from "./http";

export const adminApi = {
  listTasks(params?: {
    status?: string;
    type?: string;
    includePrivate?: boolean;
    limit?: number;
  }) {
    return requestData<AdminTask[]>({
      method: "GET",
      url: "/admin/tasks",
      params,
    });
  },

  createTask(payload: TaskCreatePayload) {
    return requestData<AdminTask>({
      method: "POST",
      url: "/admin/tasks",
      data: payload,
    });
  },

  updateTask(
    id: number,
    payload: {
      title?: string;
      description?: string | null;
      type?: "NORMAL" | "COUNTER" | "FORBIDDEN" | "CONDITIONAL" | "STREAK";
      status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
      basePoints?: number;
      config?: Record<string, unknown>;
      isPrivate?: boolean;
      startsAt?: string | null;
      endsAt?: string | null;
      categoryTagId?: number | null;
      categoryTag?:
        | {
            key: string;
            labelEn: string;
            labelAr: string;
          }
        | null;
      requiredTagKeys?: string[];
    }
  ) {
    return requestData<AdminTask>({
      method: "PATCH",
      url: `/admin/tasks/${id}`,
      data: payload,
    });
  },

  deleteTask(id: number) {
    return requestData<{ id: number; key: string; title: string }>({
      method: "DELETE",
      url: `/admin/tasks/${id}`,
    });
  },

  listCounters(params?: { includeInactive?: boolean; limit?: number }) {
    return requestData<AdminCounter[]>({
      method: "GET",
      url: "/admin/counters",
      params,
    });
  },

  createCounter(payload: {
    key: string;
    name: string;
    unit?: string;
    description?: string;
    isActive?: boolean;
  }) {
    return requestData<AdminCounter>({
      method: "POST",
      url: "/admin/counters",
      data: payload,
    });
  },

  listUsers(params?: { search?: string; limit?: number }) {
    return requestData<AdminUser[]>({
      method: "GET",
      url: "/admin/users",
      params,
    });
  },

  listUserActivities(userId: number, params?: { limit?: number }) {
    return requestData<AdminUserActivity[]>({
      method: "GET",
      url: `/admin/users/${userId}/activities`,
      params,
    });
  },

  deleteUser(userId: number) {
    return requestData<AdminUser>({
      method: "DELETE",
      url: `/admin/users/${userId}`,
    });
  },

  setUserLeaderboardVisibility(userId: number, isVisible: boolean) {
    return requestData<AdminUser>({
      method: "PATCH",
      url: `/admin/users/${userId}/leaderboard-visibility`,
      data: { isVisible },
    });
  },

  deleteUserAvatar(userId: number) {
    return requestData<AdminUser>({
      method: "DELETE",
      url: `/admin/users/${userId}/avatar`,
    });
  },

  listTaskCounterRules(params?: { taskId?: number; counterId?: number }) {
    return requestData<AdminTaskCounterRule[]>({
      method: "GET",
      url: "/admin/task-counter-rules",
      params,
    });
  },

  createTaskCounterRule(payload: {
    taskId: number;
    counterId: number;
    valueSource: "FIXED" | "ACTIVITY_INPUT";
    fixedDelta?: number;
  }) {
    return requestData<AdminTaskCounterRule>({
      method: "POST",
      url: "/admin/task-counter-rules",
      data: payload,
    });
  },

  deleteTaskCounterRule(id: number) {
    return requestData<AdminTaskCounterRule>({
      method: "DELETE",
      url: `/admin/task-counter-rules/${id}`,
    });
  },

  createManualAdjustment(payload: {
    userId: number;
    points: number;
    note?: string;
    metadata?: Record<string, unknown>;
  }) {
    return requestData({
      method: "POST",
      url: "/admin/points/adjustments",
      data: payload,
    });
  },

  createNotificationCampaign(payload: {
    title: string;
    body: string;
    targetType: "ALL_USERS" | "TAGS" | "USER_IDS";
    isAnnouncement?: boolean;
    filters: {
      tagIds: number[];
      userIds: number[];
    };
  }) {
    return requestData({
      method: "POST",
      url: "/admin/notifications/campaigns",
      data: payload,
    });
  },

  listNotificationCampaigns(limit = 100) {
    return requestData<NotificationCampaignListItem[]>({
      method: "GET",
      url: "/admin/notifications/campaigns",
      params: { limit },
    });
  },

  deleteNotificationCampaign(id: number) {
    return requestData<{ id: number; title: string }>({
      method: "DELETE",
      url: `/admin/notifications/campaigns/${id}`,
    });
  },

  createDailyQuestion(payload: {
    questionText: string;
    answerType: "TEXT" | "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "BOOLEAN";
    options?: unknown;
    correctAnswer?: unknown;
    answerExplanation?: string;
    points?: number;
    activeDate: string;
    isActive?: boolean;
  }) {
    return requestData({
      method: "POST",
      url: "/admin/daily-questions",
      data: payload,
    });
  },

  listDailyQuestions(limit = 50) {
    return requestData<DailyQuestionListItem[]>({
      method: "GET",
      url: "/admin/daily-questions",
      params: { limit },
    });
  },

  listDailyQuestionSuggestions(params: {
    answerType: "TEXT" | "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "BOOLEAN";
    limit?: number;
  }) {
    return requestData<DailyQuestionSuggestion[]>({
      method: "GET",
      url: "/admin/daily-questions/suggestions",
      params,
    });
  },

  updateDailyQuestion(
    id: number,
    payload: {
      questionText?: string;
      answerType?: "TEXT" | "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "BOOLEAN";
      options?: unknown;
      correctAnswer?: unknown;
      answerExplanation?: string;
      points?: number;
      activeDate?: string;
      isActive?: boolean;
    }
  ) {
    return requestData({
      method: "PATCH",
      url: `/admin/daily-questions/${id}`,
      data: payload,
    });
  },

  deleteDailyQuestion(id: number) {
    return requestData<{ id: number; questionText: string; activeDate: string }>({
      method: "DELETE",
      url: `/admin/daily-questions/${id}`,
    });
  },

  listDailyQuestionAnswers(id: number, limit = 200) {
    return requestData<AdminDailyQuestionAnswer[]>({
      method: "GET",
      url: `/admin/daily-questions/${id}/answers`,
      params: { limit },
    });
  },

  reviewDailyQuestionAnswer(
    answerId: number,
    payload: {
      isCorrect: boolean;
      awardedPoints?: number;
    }
  ) {
    return requestData<AdminDailyQuestionAnswer>({
      method: "PATCH",
      url: `/admin/daily-questions/answers/${answerId}/review`,
      data: payload,
    });
  },

  revealDailyQuestions() {
    return requestData<{
      questionId: number;
      revealedAt: string;
      revealedCount: number;
    }>({
      method: "POST",
      url: "/admin/daily-questions/reveal",
    });
  },

  getLeaderboard(limit = 100) {
    return requestData<LeaderboardRow[]>({
      method: "GET",
      url: "/admin/leaderboard",
      params: { limit },
    });
  },

  listAdminPermissions() {
    return requestData<string[]>({
      method: "GET",
      url: "/admin/permissions",
    });
  },

  createAdminAccount(payload: {
    email: string;
    password: string;
    displayName?: string;
    role: "ADMIN" | "SUPER_ADMIN";
    adminPermissions?: string[];
  }) {
    return requestData<AdminAccessUser>({
      method: "POST",
      url: "/admin/users/admin-accounts",
      data: payload,
    });
  },

  updateAdminAccess(
    userId: number,
    payload: {
      role?: "ADMIN" | "SUPER_ADMIN";
      adminPermissions?: string[];
    }
  ) {
    return requestData<AdminAccessUser>({
      method: "PATCH",
      url: `/admin/users/${userId}/admin-access`,
      data: payload,
    });
  },

  getScoringSettings() {
    return requestData<ScoringSettings>({
      method: "GET",
      url: "/admin/settings/scoring",
    });
  },

  updateScoringSettings(payload: ScoringSettings) {
    return requestData<ScoringSettings>({
      method: "PATCH",
      url: "/admin/settings/scoring",
      data: payload,
    });
  },
};
