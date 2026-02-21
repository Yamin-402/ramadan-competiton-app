import { listAvailableTasksQuerySchema, taskParamsSchema } from "./tasks.validator.js";
import { tasksService } from "./tasks.service.js";

export async function listAvailableTasks(req, res) {
  const query = listAvailableTasksQuerySchema.parse(req.query);
  const data = await tasksService.listAvailableTasks(req.auth, query);

  res.status(200).json({ data });
}

export async function getTaskById(req, res) {
  const { taskId } = taskParamsSchema.parse(req.params);
  const data = await tasksService.getTaskById(req.auth, taskId);

  res.status(200).json({ data });
}