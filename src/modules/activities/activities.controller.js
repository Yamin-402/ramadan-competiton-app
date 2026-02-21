import {
  createTaskCompletionSchema,
  fastingStatusQuerySchema,
  listMyActivitiesQuerySchema,
  todayTaskStatusQuerySchema,
} from "./activities.validator.js";
import { activitiesService } from "./activities.service.js";

export async function listMyActivities(req, res) {
  const query = listMyActivitiesQuerySchema.parse(req.query);
  const data = await activitiesService.listMyActivities(req.auth, query);

  res.status(200).json({ data });
}

export async function createTaskCompletion(req, res) {
  const payload = createTaskCompletionSchema.parse(req.body);
  const data = await activitiesService.createTaskCompletion(req.auth, payload);

  res.status(201).json({ data });
}

export async function getFastingStatus(req, res) {
  const query = fastingStatusQuerySchema.parse(req.query);
  const data = await activitiesService.getFastingStatus(req.auth, query);

  res.status(200).json({ data });
}

export async function getTodayTaskStatus(req, res) {
  const query = todayTaskStatusQuerySchema.parse(req.query);
  const data = await activitiesService.getTodayTaskStatus(req.auth, query);

  res.status(200).json({ data });
}
