import { Router } from "express";
import { asyncHandler } from "../../core/middleware/async-handler.js";
import { requireAuth } from "../../core/middleware/require-auth.js";
import { loadAuthUser } from "../../core/middleware/load-auth-user.js";
import { requireRole } from "../../core/middleware/require-role.js";
import { requireAdminPermission } from "../../core/middleware/require-admin-permission.js";
import {
  createAdminAccount,
  createCounter,
  createDailyQuestion,
  createManualAdjustment,
  createNotificationCampaign,
  createTaskCounterRule,
  createTask,
  deleteDailyQuestion,
  deleteNotificationCampaign,
  deleteTask,
  deleteTaskCounterRule,
  generateMotivationNotifications,
  getAiAssistSettings,
  getLeaderboard,
  getCompetitionState,
  updateCompetitionState,
  openCompetition,
  closeCompetition,
  getScoringSettings,
  listCounters,
  listDailyQuestionAnswers,
  listDailyQuestions,
  listDailyQuestionSuggestions,
  listNotificationCampaigns,
  listPermissionKeys,
  listTasks,
  listTaskCounterRules,
  listUserActivities,
  listUsers,
  removeUserAvatar,
  removeUser,
  revealDailyQuestionAnswers,
  reviewDailyQuestionAnswer,
  setUserLeaderboardVisibility,
  updateAdminAccess,
  updateAiAssistSettings,
  updateDailyQuestion,
  updateTask,
  updateScoringSettings,
} from "./admin.controller.js";

const router = Router();

router.use(requireAuth, loadAuthUser, requireRole("ADMIN", "SUPER_ADMIN"));

router.get("/permissions", requireAdminPermission("USER_MANAGEMENT"), asyncHandler(listPermissionKeys));
router.post("/users/admin-accounts", requireAdminPermission("USER_MANAGEMENT"), asyncHandler(createAdminAccount));
router.patch("/users/:id/admin-access", requireAdminPermission("USER_MANAGEMENT"), asyncHandler(updateAdminAccess));

router.post("/tasks", requireAdminPermission("TASKS"), asyncHandler(createTask));
router.get("/tasks", requireAdminPermission("TASKS"), asyncHandler(listTasks));
router.patch("/tasks/:id", requireAdminPermission("TASKS"), asyncHandler(updateTask));
router.delete("/tasks/:id", requireAdminPermission("TASKS"), asyncHandler(deleteTask));
router.post("/counters", requireAdminPermission("COUNTERS"), asyncHandler(createCounter));
router.get("/counters", requireAdminPermission("COUNTERS"), asyncHandler(listCounters));
router.get("/users", requireAdminPermission("USER_MANAGEMENT"), asyncHandler(listUsers));
router.delete("/users/:id", requireAdminPermission("USER_MANAGEMENT"), asyncHandler(removeUser));
router.patch(
  "/users/:id/leaderboard-visibility",
  requireAdminPermission("LEADERBOARD"),
  asyncHandler(setUserLeaderboardVisibility)
);
router.delete("/users/:id/avatar", requireAdminPermission("USER_MANAGEMENT"), asyncHandler(removeUserAvatar));
router.get("/users/:id/activities", requireAdminPermission("USER_TASK_HISTORY"), asyncHandler(listUserActivities));
router.post("/task-counter-rules", requireAdminPermission("TASK_COUNTER_RULES"), asyncHandler(createTaskCounterRule));
router.get("/task-counter-rules", requireAdminPermission("TASK_COUNTER_RULES"), asyncHandler(listTaskCounterRules));
router.delete(
  "/task-counter-rules/:id",
  requireAdminPermission("TASK_COUNTER_RULES"),
  asyncHandler(deleteTaskCounterRule)
);
router.post("/points/adjustments", requireAdminPermission("ADJUSTMENTS"), asyncHandler(createManualAdjustment));
router.post(
  "/notifications/campaigns",
  requireAdminPermission("NOTIFICATIONS"),
  asyncHandler(createNotificationCampaign)
);
router.get("/notifications/campaigns", requireAdminPermission("NOTIFICATIONS"), asyncHandler(listNotificationCampaigns));
router.delete(
  "/notifications/campaigns/:id",
  requireAdminPermission("NOTIFICATIONS"),
  asyncHandler(deleteNotificationCampaign)
);
router.post(
  "/notifications/motivation/generate",
  requireAdminPermission("NOTIFICATIONS"),
  asyncHandler(generateMotivationNotifications)
);
router.post("/daily-questions", requireAdminPermission("DAILY_QUESTIONS"), asyncHandler(createDailyQuestion));
router.get("/daily-questions", requireAdminPermission("DAILY_QUESTIONS"), asyncHandler(listDailyQuestions));
router.get(
  "/daily-questions/suggestions",
  requireAdminPermission("DAILY_QUESTIONS"),
  asyncHandler(listDailyQuestionSuggestions)
);
router.post("/daily-questions/reveal", requireAdminPermission("DAILY_QUESTIONS"), asyncHandler(revealDailyQuestionAnswers));
router.patch("/daily-questions/:id", requireAdminPermission("DAILY_QUESTIONS"), asyncHandler(updateDailyQuestion));
router.delete("/daily-questions/:id", requireAdminPermission("DAILY_QUESTIONS"), asyncHandler(deleteDailyQuestion));
router.get("/daily-questions/:id/answers", requireAdminPermission("DAILY_QUESTIONS"), asyncHandler(listDailyQuestionAnswers));
router.patch(
  "/daily-questions/answers/:answerId/review",
  requireAdminPermission("DAILY_QUESTIONS"),
  asyncHandler(reviewDailyQuestionAnswer)
);
router.get("/leaderboard", requireAdminPermission("LEADERBOARD"), asyncHandler(getLeaderboard));
router.get("/competition", requireAdminPermission("COMPETITION"), asyncHandler(getCompetitionState));
router.post("/competition/open", requireAdminPermission("COMPETITION"), asyncHandler(openCompetition));
router.post("/competition/close", requireAdminPermission("COMPETITION"), asyncHandler(closeCompetition));
router.patch("/competition", requireAdminPermission("COMPETITION"), asyncHandler(updateCompetitionState));

router.get("/settings/scoring", requireAdminPermission("TASKS"), asyncHandler(getScoringSettings));
router.patch("/settings/scoring", requireAdminPermission("TASKS"), asyncHandler(updateScoringSettings));
router.get("/settings/ai-assist", requireAdminPermission("DAILY_QUESTIONS"), asyncHandler(getAiAssistSettings));
router.patch(
  "/settings/ai-assist",
  requireAdminPermission("DAILY_QUESTIONS"),
  asyncHandler(updateAiAssistSettings)
);

export default router;

