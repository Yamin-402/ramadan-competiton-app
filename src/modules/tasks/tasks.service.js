import { AppError } from "../../core/errors/app-error.js";
import { getAuthUserId } from "../../core/utils/get-auth-user-id.js";
import { tasksRepository } from "./tasks.repository.js";

function canUserAccessTask(task, userTagIds) {
  if (!task.tagRequirements || task.tagRequirements.length === 0) {
    return true;
  }

  return task.tagRequirements.every((requirement) => userTagIds.has(requirement.tagId));
}

function isTaskInWindow(task, at) {
  if (task.startsAt && at < task.startsAt) {
    return false;
  }

  if (task.endsAt && at > task.endsAt) {
    return false;
  }

  return task.status === "ACTIVE";
}

export const tasksService = {
  async listAvailableTasks(auth, query) {
    const userId = getAuthUserId(auth);
    const at = query.at ? new Date(query.at) : new Date();

    if (Number.isNaN(at.getTime())) {
      throw new AppError(400, "Invalid datetime format for query.at");
    }

    const [tagIds, tasks] = await Promise.all([
      tasksRepository.findUserTagIds(userId),
      tasksRepository.findActiveTasks(at),
    ]);

    const userTagSet = new Set(tagIds);

    return tasks.filter((task) => isTaskInWindow(task, at) && canUserAccessTask(task, userTagSet));
  },

  async getTaskById(auth, taskId) {
    const userId = getAuthUserId(auth);

    const [tagIds, task] = await Promise.all([
      tasksRepository.findUserTagIds(userId),
      tasksRepository.findTaskById(taskId),
    ]);

    if (!task || task.status !== "ACTIVE") {
      throw new AppError(404, "Task not found");
    }

    const userTagSet = new Set(tagIds);
    if (!canUserAccessTask(task, userTagSet)) {
      throw new AppError(403, "Task is not visible for this user");
    }

    return task;
  },
};