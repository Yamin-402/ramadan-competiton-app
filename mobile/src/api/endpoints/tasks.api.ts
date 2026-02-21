import { apiClient, unwrapData } from "../client";
import { Task } from "../../types/domain";

export const tasksApi = {
  listAvailable(at?: string) {
    return unwrapData<Task[]>(
      apiClient.get("/tasks/available", {
        params: at ? { at } : undefined,
      })
    );
  },

  getById(taskId: number) {
    return unwrapData<Task>(apiClient.get(`/tasks/${taskId}`));
  },
};
