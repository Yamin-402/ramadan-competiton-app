import { apiClient, unwrapData } from "../client";
import { Streak } from "../../types/domain";

export const streaksApi = {
  listMine() {
    return unwrapData<Streak[]>(apiClient.get("/streaks/my"));
  },

  evaluate(taskId?: number) {
    return unwrapData<Streak[]>(
      apiClient.post("/streaks/evaluate", taskId ? { taskId } : {})
    );
  },
};
