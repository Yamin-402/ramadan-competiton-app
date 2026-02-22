import { Router } from "express";
import { asyncHandler } from "../../core/middleware/async-handler.js";
import { requireAuth } from "../../core/middleware/require-auth.js";
import { requireRole } from "../../core/middleware/require-role.js";
import {
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
  getLeaderboard,
  listCounters,
  listDailyQuestionAnswers,
  listDailyQuestions,
  listNotificationCampaigns,
  listTasks,
  listTaskCounterRules,
  listUserActivities,
  listUsers,
  removeUserAvatar,
  removeUser,
  revealDailyQuestionAnswers,
  reviewDailyQuestionAnswer,
  setUserLeaderboardVisibility,
  updateDailyQuestion,
  updateTask,
} from "./admin.controller.js";

const router = Router();

router.use(requireAuth, requireRole("ADMIN", "SUPER_ADMIN"));

router.post("/tasks", asyncHandler(createTask));
router.get("/tasks", asyncHandler(listTasks));
router.patch("/tasks/:id", asyncHandler(updateTask));
router.delete("/tasks/:id", asyncHandler(deleteTask));
router.post("/counters", asyncHandler(createCounter));
router.get("/counters", asyncHandler(listCounters));
router.get("/users", asyncHandler(listUsers));
router.delete("/users/:id", asyncHandler(removeUser));
router.patch("/users/:id/leaderboard-visibility", asyncHandler(setUserLeaderboardVisibility));
router.delete("/users/:id/avatar", asyncHandler(removeUserAvatar));
router.get("/users/:id/activities", asyncHandler(listUserActivities));
router.post("/task-counter-rules", asyncHandler(createTaskCounterRule));
router.get("/task-counter-rules", asyncHandler(listTaskCounterRules));
router.delete("/task-counter-rules/:id", asyncHandler(deleteTaskCounterRule));
router.post("/points/adjustments", asyncHandler(createManualAdjustment));
router.post("/notifications/campaigns", asyncHandler(createNotificationCampaign));
router.get("/notifications/campaigns", asyncHandler(listNotificationCampaigns));
router.delete("/notifications/campaigns/:id", asyncHandler(deleteNotificationCampaign));
router.post("/daily-questions", asyncHandler(createDailyQuestion));
router.get("/daily-questions", asyncHandler(listDailyQuestions));
router.post("/daily-questions/reveal", asyncHandler(revealDailyQuestionAnswers));
router.patch("/daily-questions/:id", asyncHandler(updateDailyQuestion));
router.delete("/daily-questions/:id", asyncHandler(deleteDailyQuestion));
router.get("/daily-questions/:id/answers", asyncHandler(listDailyQuestionAnswers));
router.patch("/daily-questions/answers/:answerId/review", asyncHandler(reviewDailyQuestionAnswer));
router.get("/leaderboard", asyncHandler(getLeaderboard));

export default router;
