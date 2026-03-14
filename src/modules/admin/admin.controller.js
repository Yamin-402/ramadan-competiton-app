import {
  adminLeaderboardQuerySchema,
  createAdminAccountSchema,
  createCounterSchema,
  createDailyQuestionSchema,
  createManualAdjustmentSchema,
  createNotificationCampaignSchema,
  createTaskCounterRuleSchema,
  createTaskSchema,
  dailyQuestionAnswerParamsSchema,
  dailyQuestionParamsSchema,
  generateMotivationNotificationsSchema,
  leaderboardVisibilitySchema,
  listAdminCountersQuerySchema,
  listAdminUserActivitiesQuerySchema,
  listAdminTasksQuerySchema,
  listAdminUsersQuerySchema,
  listDailyQuestionAnswersQuerySchema,
  listDailyQuestionsQuerySchema,
  listDailyQuestionSuggestionsQuerySchema,
  listNotificationCampaignsQuerySchema,
  listTaskCounterRulesQuerySchema,
  notificationCampaignParamsSchema,
  reviewDailyQuestionAnswerSchema,
  taskParamsSchema,
  taskCounterRuleParamsSchema,
  updateAiAssistSettingsSchema,
  updateAdminAccessSchema,
  updateScoringSettingsSchema,
  updateDailyQuestionSchema,
  userParamsSchema,
  updateTaskSchema,
} from "./admin.validator.js";
import { ADMIN_PERMISSION_KEYS } from "../../core/auth/admin-permissions.js";
import { adminService } from "./admin.service.js";

export async function createCounter(req, res) {
  const payload = createCounterSchema.parse(req.body);
  const data = await adminService.createCounter(req.auth, payload);

  res.status(201).json({ data });
}

export async function listCounters(req, res) {
  const query = listAdminCountersQuerySchema.parse(req.query);
  const data = await adminService.listCounters(req.auth, query);

  res.status(200).json({ data });
}

export async function createTaskCounterRule(req, res) {
  const payload = createTaskCounterRuleSchema.parse(req.body);
  const data = await adminService.createTaskCounterRule(req.auth, payload);

  res.status(201).json({ data });
}

export async function listTaskCounterRules(req, res) {
  const query = listTaskCounterRulesQuerySchema.parse(req.query);
  const data = await adminService.listTaskCounterRules(req.auth, query);

  res.status(200).json({ data });
}

export async function deleteTaskCounterRule(req, res) {
  const { id } = taskCounterRuleParamsSchema.parse(req.params);
  const data = await adminService.deleteTaskCounterRule(req.auth, id);

  res.status(200).json({ data });
}

export async function createTask(req, res) {
  const payload = createTaskSchema.parse(req.body);
  const data = await adminService.createTask(req.auth, payload);

  res.status(201).json({ data });
}

export async function listTasks(req, res) {
  const query = listAdminTasksQuerySchema.parse(req.query);
  const data = await adminService.listTasks(req.auth, query);

  res.status(200).json({ data });
}

export async function updateTask(req, res) {
  const { id } = taskParamsSchema.parse(req.params);
  const payload = updateTaskSchema.parse(req.body);
  const data = await adminService.updateTask(req.auth, id, payload);

  res.status(200).json({ data });
}

export async function deleteTask(req, res) {
  const { id } = taskParamsSchema.parse(req.params);
  const data = await adminService.deleteTask(req.auth, id);

  res.status(200).json({ data });
}

export async function listUsers(req, res) {
  const query = listAdminUsersQuerySchema.parse(req.query);
  const data = await adminService.listUsers(req.auth, query);

  res.status(200).json({ data });
}

export async function removeUser(req, res) {
  const { id } = userParamsSchema.parse(req.params);
  const data = await adminService.removeUser(req.auth, id);

  res.status(200).json({ data });
}

export async function setUserLeaderboardVisibility(req, res) {
  const { id } = userParamsSchema.parse(req.params);
  const payload = leaderboardVisibilitySchema.parse(req.body);
  const data = await adminService.setUserLeaderboardVisibility(req.auth, id, payload.isVisible);

  res.status(200).json({ data });
}

export async function removeUserAvatar(req, res) {
  const { id } = userParamsSchema.parse(req.params);
  const data = await adminService.removeUserAvatar(req.auth, id);

  res.status(200).json({ data });
}

export async function listUserActivities(req, res) {
  const { id } = userParamsSchema.parse(req.params);
  const query = listAdminUserActivitiesQuerySchema.parse(req.query);
  const data = await adminService.listUserActivities(req.auth, id, query);

  res.status(200).json({ data });
}

export async function createManualAdjustment(req, res) {
  const payload = createManualAdjustmentSchema.parse(req.body);
  const data = await adminService.createManualAdjustment(req.auth, payload);

  res.status(201).json({ data });
}

export async function createNotificationCampaign(req, res) {
  const payload = createNotificationCampaignSchema.parse(req.body);
  const data = await adminService.createNotificationCampaign(req.auth, payload);

  res.status(201).json({ data });
}

export async function listNotificationCampaigns(req, res) {
  const query = listNotificationCampaignsQuerySchema.parse(req.query);
  const data = await adminService.listNotificationCampaigns(req.auth, query);

  res.status(200).json({ data });
}

export async function deleteNotificationCampaign(req, res) {
  const { id } = notificationCampaignParamsSchema.parse(req.params);
  const data = await adminService.deleteNotificationCampaign(req.auth, id);

  res.status(200).json({ data });
}

export async function generateMotivationNotifications(req, res) {
  const payload = generateMotivationNotificationsSchema.parse(req.body || {});
  const data = await adminService.generateMotivationNotifications(req.auth, payload);

  res.status(200).json({ data });
}

export async function createDailyQuestion(req, res) {
  const payload = createDailyQuestionSchema.parse(req.body);
  const data = await adminService.createDailyQuestion(req.auth, payload);

  res.status(201).json({ data });
}

export async function listDailyQuestions(req, res) {
  const query = listDailyQuestionsQuerySchema.parse(req.query);
  const data = await adminService.listDailyQuestions(req.auth, query);

  res.status(200).json({ data });
}

export async function listDailyQuestionSuggestions(req, res) {
  const query = listDailyQuestionSuggestionsQuerySchema.parse(req.query);
  const data = await adminService.listDailyQuestionSuggestions(req.auth, query);

  res.status(200).json({ data });
}

export async function updateDailyQuestion(req, res) {
  const { id } = dailyQuestionParamsSchema.parse(req.params);
  const payload = updateDailyQuestionSchema.parse(req.body);
  const data = await adminService.updateDailyQuestion(req.auth, id, payload);

  res.status(200).json({ data });
}

export async function deleteDailyQuestion(req, res) {
  const { id } = dailyQuestionParamsSchema.parse(req.params);
  const data = await adminService.deleteDailyQuestion(req.auth, id);

  res.status(200).json({ data });
}

export async function listDailyQuestionAnswers(req, res) {
  const { id } = dailyQuestionParamsSchema.parse(req.params);
  const query = listDailyQuestionAnswersQuerySchema.parse(req.query);
  const data = await adminService.listDailyQuestionAnswers(req.auth, id, query);

  res.status(200).json({ data });
}

export async function reviewDailyQuestionAnswer(req, res) {
  const { answerId } = dailyQuestionAnswerParamsSchema.parse(req.params);
  const payload = reviewDailyQuestionAnswerSchema.parse(req.body);
  const data = await adminService.reviewDailyQuestionAnswer(req.auth, answerId, payload);

  res.status(200).json({ data });
}

export async function revealDailyQuestionAnswers(req, res) {
  const data = await adminService.revealDailyQuestionAnswers(req.auth);

  res.status(200).json({ data });
}

export async function getLeaderboard(req, res) {
  const query = adminLeaderboardQuerySchema.parse(req.query);
  const data = await adminService.getLeaderboard(req.auth, query);

  res.status(200).json({ data });
}

export async function listPermissionKeys(_req, res) {
  res.status(200).json({ data: ADMIN_PERMISSION_KEYS });
}

export async function createAdminAccount(req, res) {
  const payload = createAdminAccountSchema.parse(req.body);
  const data = await adminService.createAdminAccount(req.auth, payload);

  res.status(201).json({ data });
}

export async function updateAdminAccess(req, res) {
  const { id } = userParamsSchema.parse(req.params);
  const payload = updateAdminAccessSchema.parse(req.body);
  const data = await adminService.updateAdminAccess(req.auth, id, payload);

  res.status(200).json({ data });
}

export async function getScoringSettings(req, res) {
  const data = await adminService.getScoringSettings(req.auth);

  res.status(200).json({ data });
}

export async function updateScoringSettings(req, res) {
  const payload = updateScoringSettingsSchema.parse(req.body);
  const data = await adminService.updateScoringSettings(req.auth, payload);

  res.status(200).json({ data });
}

export async function getAiAssistSettings(req, res) {
  const data = await adminService.getAiAssistSettings(req.auth);

  res.status(200).json({ data });
}

export async function updateAiAssistSettings(req, res) {
  const payload = updateAiAssistSettingsSchema.parse(req.body || {});
  const data = await adminService.updateAiAssistSettings(req.auth, payload);

  res.status(200).json({ data });
}
