import { getAuthUserId } from "../../core/utils/get-auth-user-id.js";
import { countersRepository } from "./counters.repository.js";

export const countersService = {
  getMyCounters(auth) {
    const userId = getAuthUserId(auth);
    return countersRepository.getUserCounterTotals(userId);
  },
};