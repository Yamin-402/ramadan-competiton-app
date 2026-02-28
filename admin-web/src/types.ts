export type UserRole = "USER" | "ADMIN" | "SUPER_ADMIN";
export type TaskType = "NORMAL" | "COUNTER" | "FORBIDDEN" | "CONDITIONAL" | "STREAK";
export type TaskStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type CounterValueSource = "FIXED" | "ACTIVITY_INPUT";
export type ConditionType = "TASK_COMPLETIONS" | "COUNTER_TOTAL" | "STREAK_DAYS" | "TAG_PRESENT";
export type ConditionOperator = "EQ" | "NEQ" | "GT" | "GTE" | "LT" | "LTE";
export type NotificationTargetType = "ALL_USERS" | "TAGS" | "USER_IDS";
export type DailyQuestionType = "TEXT" | "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "BOOLEAN";

export interface AdminSessionUser {
  id: number;
  email: string;
  displayName: string | null;
  role: UserRole;
  adminPermissions?: string[] | null;
}

export interface AdminSession {
  token: string;
  user: AdminSessionUser;
}

export interface Tag {
  id: number;
  key: string;
  label: string;
  labelEn?: string | null;
  labelAr?: string | null;
  isActive: boolean;
}

export interface AdminTask {
  id: number;
  key: string;
  title: string;
  description: string | null;
  type: TaskType;
  status: TaskStatus;
  basePoints: string | number;
  isPrivate: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  config?: Record<string, unknown> | null;
  categoryTag?: {
    id: number;
    key: string;
    label: string;
    labelEn?: string | null;
    labelAr?: string | null;
  } | null;
  tagRequirements?: Array<{
    tag: {
      key: string;
    };
  }>;
}

export interface AdminCounter {
  id: number;
  key: string;
  name: string;
  unit: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface AdminUser {
  id: number;
  email: string;
  displayName: string | null;
  avatarUrl?: string | null;
  role: UserRole;
  adminPermissions?: string[] | null;
  isLeaderboardVisible?: boolean;
}

export interface AdminAccessUser {
  id: number;
  email: string;
  displayName: string | null;
  role: UserRole;
  adminPermissions: string[] | null;
  isActive: boolean;
}

export interface AdminTaskCounterRule {
  id: number;
  taskId: number;
  counterId: number;
  valueSource: CounterValueSource;
  fixedDelta: string | number | null;
  createdAt: string;
  task: {
    id: number;
    key: string;
    title: string;
    type: TaskType;
    status: TaskStatus;
  };
  counter: {
    id: number;
    key: string;
    name: string;
    unit: string | null;
    isActive: boolean;
  };
}

export interface NotificationCampaignListItem {
  campaign: {
    id: number;
    title: string;
    body: string;
    targetType: NotificationTargetType;
    status: "PENDING" | "SENT" | "FAILED";
    sentAt: string | null;
    createdAt: string;
    filters: {
      tagIds: number[];
      userIds: number[];
    };
    targetTags: Array<{
      tag: {
        id: number;
        key: string;
        label: string;
      };
    }>;
    createdBy: {
      id: number;
      email: string;
      displayName: string | null;
    };
  };
  stats: {
    pending: number;
    sent: number;
    failed: number;
  };
}

export interface DailyQuestionListItem {
  id: number;
  questionText: string;
  answerType: DailyQuestionType;
  options: unknown;
  correctAnswer: unknown;
  points: string | number;
  activeDate: string;
  isActive: boolean;
  createdAt: string;
  _count: {
    answers: number;
  };
}

export interface LeaderboardRow {
  rank: number;
  user: {
    id: number;
    email: string;
    displayName: string | null;
    avatarUrl?: string | null;
    isLeaderboardVisible?: boolean;
  } | null;
  totalPoints: number;
  publicPoints: number;
}

export interface AdminUserActivity {
  id: number;
  competitionDate?: string;
  type: "TASK_COMPLETION" | "MANUAL_ADJUSTMENT" | "STREAK_EVALUATION" | "DAILY_QUESTION_ANSWER" | "SYSTEM";
  occurredAt: string;
  isDuringFasting: boolean;
  basePoints: string | number;
  effectivePoints: string | number;
  note: string | null;
  metadata?: Record<string, unknown> | null;
  isForbidden: boolean;
  task: {
    id: number;
    key: string;
    title: string;
    type: TaskType;
    basePoints?: string | number;
    config?: Record<string, unknown> | null;
  } | null;
  counterDeltas: Array<{
    id: number;
    delta: string | number;
    counter: {
      id: number;
      key: string;
      name: string;
      unit: string | null;
    };
  }>;
}

export interface AdminDailyQuestionAnswer {
  id: number;
  questionId: number;
  userId: number;
  answer: unknown;
  isCorrect: boolean | null;
  awardedPoints: string | number;
  isRevealed: boolean;
  revealedAt: string | null;
  createdAt: string;
  user: {
    id: number;
    email: string;
    displayName: string | null;
  };
}

export interface TaskCreatePayload {
  key: string;
  title: string;
  description?: string;
  type: TaskType;
  status: TaskStatus;
  basePoints: number;
  config?: Record<string, unknown>;
  isPrivate?: boolean;
  startsAt?: string;
  endsAt?: string;
  categoryTagId?: number;
  categoryTag?: {
    key: string;
    labelEn: string;
    labelAr: string;
  };
  requiredTagKeys: string[];
  dependencies: Array<{
    dependsOnTaskId: number;
    minCompletions: number;
    withinDays?: number;
  }>;
  counterRules: Array<{
    counterKey: string;
    valueSource: CounterValueSource;
    fixedDelta?: number;
    allowNegative: boolean;
    metadata?: Record<string, unknown>;
  }>;
  conditions: Array<{
    type: ConditionType;
    operator: ConditionOperator;
    value: number;
    targetTaskId?: number;
    targetCounterKey?: string;
    targetTagKey?: string;
    withinDays?: number;
  }>;
}
