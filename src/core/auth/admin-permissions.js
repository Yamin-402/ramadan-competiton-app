export const ADMIN_PERMISSION_KEYS = [
  "DASHBOARD",
  "TASKS",
  "COUNTERS",
  "TASK_COUNTER_RULES",
  "ADJUSTMENTS",
  "NOTIFICATIONS",
  "DAILY_QUESTIONS",
  "LEADERBOARD",
  "USER_TASK_HISTORY",
  "COMPETITION",
  "USER_MANAGEMENT",
];

export function normalizeAdminPermissions(values) {
  if (!Array.isArray(values)) {
    return null;
  }

  const normalized = Array.from(
    new Set(
      values
        .map((value) => String(value).trim().toUpperCase())
        .filter((value) => ADMIN_PERMISSION_KEYS.includes(value))
    )
  );

  return normalized.length > 0 ? normalized : [];
}

