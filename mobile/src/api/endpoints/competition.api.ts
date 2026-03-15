import { requestData } from "../client";
import { CompetitionState } from "../../types/domain";

export const competitionApi = {
  getState() {
    return requestData<CompetitionState>({
      method: "GET",
      url: "/competition/state",
    });
  },
};
