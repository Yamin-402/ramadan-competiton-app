import { apiClient, unwrapDataWithMeta } from "../client";
import { PaginatedMeta } from "../../types/api";
import { LeaderboardItem } from "../../types/domain";

export const leaderboardApi = {
  get(page = 1, pageSize = 20) {
    return unwrapDataWithMeta<LeaderboardItem[], PaginatedMeta>(
      apiClient.get("/leaderboard", {
        params: { page, pageSize },
      })
    );
  },
};
