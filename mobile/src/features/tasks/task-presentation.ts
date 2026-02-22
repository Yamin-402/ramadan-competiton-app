import { Task } from "../../types/domain";

export type TaskInteractionKind = "NUMERIC" | "YES_NO" | "CONDITIONAL";

function normalizeLabel(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getConfigString(task: Task, key: string): string | null {
  const raw = task.config?.[key];
  if (typeof raw !== "string") {
    return null;
  }

  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getConfigNumber(task: Task, key: string): number | null {
  const raw = task.config?.[key];
  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Math.floor(value);
}

function getConfigPositiveNumber(task: Task, key: string): number | null {
  const raw = task.config?.[key];
  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value;
}

function getTaskAudience(task: Task): string | null {
  const raw = task.config?.audience;
  if (typeof raw !== "string") {
    return null;
  }

  const audience = raw.trim().toUpperCase();
  return audience.length > 0 ? audience : null;
}

function hasStudyAudience(task: Task): boolean {
  const audience = getTaskAudience(task);
  return audience === "SCHOOL" || audience === "UNIVERSITY" || audience === "SCHOOL_EGYPTIAN" || audience === "SCHOOL_FOREIGN";
}

export function isCounterTask(task: Task): boolean {
  if (task.type === "COUNTER") {
    return true;
  }

  const flowType = getConfigString(task, "taskFlowType")?.toUpperCase();
  return flowType === "COUNTER" || flowType === "TIMED";
}

export function isTimedTask(task: Task): boolean {
  return getConfigString(task, "taskFlowType")?.toUpperCase() === "TIMED";
}

export function isConditionalTask(task: Task): boolean {
  if (task.type === "CONDITIONAL") {
    return true;
  }

  return (
    getConfigString(task, "taskFlowType")?.toUpperCase() === "CONDITIONAL" ||
    task.conditions.length > 0 ||
    task.dependencies.length > 0
  );
}

export function isAutoConditionalBonusTask(task: Task): boolean {
  if (!isConditionalTask(task)) {
    return false;
  }

  const childTaskIds = task.config?.conditionalChildTaskIds;
  if (!Array.isArray(childTaskIds)) {
    return false;
  }

  return childTaskIds.some((value) => Number.isInteger(Number(value)) && Number(value) > 0);
}

export function isStreakEnabledTask(task: Task): boolean {
  if (task.type === "STREAK") {
    return true;
  }

  const raw = task.config?.streakEnabled;
  if (raw === true) {
    return true;
  }
  if (typeof raw === "string") {
    return raw.trim().toLowerCase() === "true";
  }

  return false;
}

export function getStreakGoalDays(task: Task): number | null {
  if (!isStreakEnabledTask(task)) {
    return null;
  }

  return getConfigNumber(task, "streakGoalDays");
}

export function getStreakBonusPoints(task: Task): number | null {
  if (!isStreakEnabledTask(task)) {
    return null;
  }

  return getConfigPositiveNumber(task, "streakBonusPoints");
}

export function getStreakDaysLeft(task: Task, currentStreak: number): number | null {
  const goalDays = getStreakGoalDays(task);
  if (!goalDays) {
    return null;
  }

  const remaining = goalDays - currentStreak;
  return remaining > 0 ? remaining : 0;
}

export function getDailyCompletionLimit(task: Task): number | null {
  const policy = getConfigString(task, "completionPolicy")?.toUpperCase();
  if (policy === "SINGLE") {
    return 1;
  }
  if (policy === "MULTIPLE_UNLIMITED") {
    return null;
  }
  if (policy === "MULTIPLE_LIMITED") {
    return getConfigNumber(task, "maxCompletionsPerCompetitionDay") || 1;
  }

  const explicitMax = getConfigNumber(task, "maxCompletionsPerCompetitionDay");
  if (explicitMax) {
    return explicitMax;
  }

  const allowMultipleRaw = task.config?.allowMultipleCompletionsPerCompetitionDay;
  if (
    allowMultipleRaw === true ||
    (typeof allowMultipleRaw === "string" && allowMultipleRaw.trim().toLowerCase() === "true")
  ) {
    return null;
  }

  if (isCounterTask(task)) {
    return null;
  }

  return 1;
}

export function getTaskCategory(task: Task): string {
  const configKeys = ["category", "categoryLabel", "categoryKey", "group", "section"];
  for (const key of configKeys) {
    const value = getConfigString(task, key);
    if (value && value.trim().toLowerCase() !== "tracking") {
      return normalizeLabel(value);
    }
  }

  if (task.type === "FORBIDDEN") {
    return "Forbidden";
  }

  if (hasStudyAudience(task)) {
    return "Study";
  }

  return "Prayers";
}

export function getTaskInteractionKind(task: Task): TaskInteractionKind {
  const hasNumericInput =
    isCounterTask(task) || task.counterRules.some((rule) => rule.valueSource === "ACTIVITY_INPUT");
  if (hasNumericInput) {
    return "NUMERIC";
  }

  if (isConditionalTask(task)) {
    return "CONDITIONAL";
  }

  return "YES_NO";
}

export function getTaskTypeLabel(task: Task): string {
  if (isTimedTask(task)) {
    return "Timed";
  }

  const interaction = getTaskInteractionKind(task);
  if (interaction === "NUMERIC") {
    return "Numeric";
  }
  if (interaction === "CONDITIONAL") {
    return "Conditional";
  }
  return "Yes/No";
}
