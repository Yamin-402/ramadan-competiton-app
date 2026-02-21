export function isStreakEnabledTask(task) {
  if (!task) {
    return false;
  }

  if (task.type === "STREAK") {
    return true;
  }

  const config = task.config;
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return false;
  }

  return config.streakEnabled === true;
}
