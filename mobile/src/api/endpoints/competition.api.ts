import { apiClient, unwrapData } from "../client";
import { CompetitionState } from "../../types/domain";

export const competitionApi = {
  getState() {
    return unwrapData<CompetitionState>(apiClient.get("/competition/state"));
  },
};

