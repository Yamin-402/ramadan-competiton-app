export type UserRole = "USER" | "ADMIN" | "SUPER_ADMIN";
export type TaskType = "NORMAL" | "COUNTER" | "FORBIDDEN" | "CONDITIONAL" | "STREAK";
export type TaskStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type CounterValueSource = "FIXED" | "ACTIVITY_INPUT";
export type DailyQuestionType = "TEXT" | "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "BOOLEAN";
export type MoneyTriggerType =
  | "MISS_TASK"
  | "COMPLETE_TASK"
  | "DO_FORBIDDEN"
  | "AVOID_FORBIDDEN";

export interface Tag {
  id: number;
  key: string;
  label: string;
  labelEn?: string | null;
  labelAr?: string | null;
}

export interface UserTag {
  tag: Tag;
}

export interface User {
  id: number;
  email: string;
  displayName: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  isStreakPublic?: boolean;
  role: UserRole;
  isActive: boolean;
  tags: UserTag[];
}

export interface TaskCounterRule {
  id: number;
  counterId: number;
  valueSource: CounterValueSource;
  fixedDelta: number | string | null;
}

export interface TaskCondition {
  id: number;
  type: string;
  operator: string;
  value: number;
  withinDays?: number | null;
  targetTaskId?: number | null;
  targetCounterId?: number | null;
  targetTagId?: number | null;
}

export interface TaskDependency {
  id: number;
  dependsOnTaskId: number;
  minCompletions: number;
  withinDays: number | null;
}

export interface Task {
  id: number;
  key: string;
  title: string;
  description: string | null;
  type: TaskType;
  status: TaskStatus;
  basePoints: number | string;
  isPrivate: boolean;
  createdAt?: string;
  categoryTag?: Tag | null;
  config?: Record<string, unknown> | null;
  counterRules: TaskCounterRule[];
  dependencies: TaskDependency[];
  conditions: TaskCondition[];
}

export interface CounterDelta {
  id: number;
  delta: number | string;
  counter: {
    id: number;
    key: string;
    name: string;
    unit: string | null;
  };
}

export interface Activity {
  id: number;
  occurredAt: string;
  competitionDate?: string;
  type: string;
  basePoints: number | string;
  effectivePoints: number | string;
  isDuringFasting: boolean;
  isForbidden: boolean;
  note?: string | null;
  metadata?: Record<string, unknown> | null;
  task?: {
    id: number;
    key: string;
    title: string;
    type: TaskType;
    basePoints?: number | string;
    config?: Record<string, unknown> | null;
  } | null;
  counterDeltas: CounterDelta[];
}

export interface DailyQuestion {
  id: number;
  questionText: string;
  answerType: DailyQuestionType;
  options?: unknown;
  correctAnswer?: unknown;
  points: number | string;
  activeDate: string;
  isActive: boolean;
}

export interface DailyQuestionHistoryItem {
  id: number;
  question: DailyQuestion;
  answer: unknown | null;
  questionCorrectAnswer?: unknown;
  didAnswer?: boolean;
  status: "pending" | "revealed";
  isCorrect: boolean | null;
  awardedPoints: number | string;
  createdAt: string;
  revealedAt: string | null;
}

export interface NotificationRecipient {
  id: number;
  readAt: string | null;
  createdAt: string;
  campaign: {
    id: number;
    title: string;
    body: string;
    status: string;
    sentAt: string | null;
    createdAt: string;
  };
}

export interface LeaderboardItem {
  rank: number;
  totalPoints: number | string;
  publicScore: number | string;
  user: {
    id: number;
    displayName: string | null;
    email: string;
    avatarUrl?: string | null;
    isStreakPublic?: boolean;
  } | null;
}

export interface Streak {
  id: number;
  taskId: number;
  currentStreak: number;
  longestStreak: number;
  graceDaysUsed: number;
  rewardMultiplier: number | string;
  lastActivityDate: string | null;
  task: {
    id: number;
    key: string;
    title: string;
    type: TaskType;
    status: TaskStatus;
    config?: Record<string, unknown> | null;
  };
}

export interface MoneyCommitment {
  id: number;
  taskId: number;
  triggerType: MoneyTriggerType;
  amount: number | string;
  active: boolean;
  updatedAt: string;
  task: {
    id: number;
    key: string;
    title: string;
    type: TaskType;
    status: TaskStatus;
  };
}

export interface MoneyEntry {
  id: number;
  taskId: number;
  triggerType: MoneyTriggerType;
  amount: number | string;
  reason: string;
  date: string;
  createdAt: string;
  removedAt: string | null;
  task: {
    id: number;
    key: string;
    title: string;
    type: TaskType;
    status: TaskStatus;
  };
}

export interface PublicUserProfile {
  id: number;
  displayName: string | null;
  bio: string | null;
  avatarUrl?: string | null;
  isStreakPublic: boolean;
  educationLevel?: "SCHOOL" | "UNIVERSITY" | null;
  totalPoints?: number | string;
  streakSummary: {
    activeStreaks: number;
    bestCurrentStreak: number;
    longestStreak: number;
  } | null;
}
