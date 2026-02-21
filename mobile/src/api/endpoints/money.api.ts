import { apiClient, unwrapData } from "../client";
import { MoneyCommitment, MoneyEntry, MoneyTriggerType } from "../../types/domain";

interface CreateCommitmentPayload {
  taskId: number;
  triggerType: MoneyTriggerType;
  amount: number;
  active?: boolean;
}

interface CreateFriendlyCommitmentPayload {
  taskId: number;
  when: "COMPLETED" | "NOT_COMPLETED";
  amount: number;
  active?: boolean;
}

interface MoneySummaryResponse {
  totalAmount: number | string;
  entries: MoneyEntry[];
}

interface EvaluateResponse {
  created: number;
}

interface RemoveEntryResponse {
  removed: boolean;
  alreadyRemoved?: boolean;
}

export const moneyApi = {
  listCommitments(active?: boolean) {
    return unwrapData<MoneyCommitment[]>(
      apiClient.get("/money/commitments", {
        params: typeof active === "boolean" ? { active } : undefined,
      })
    );
  },

  createCommitment(payload: CreateCommitmentPayload) {
    return unwrapData<MoneyCommitment>(apiClient.post("/money/commitments", payload));
  },

  createFriendlyCommitment(payload: CreateFriendlyCommitmentPayload) {
    return unwrapData<MoneyCommitment>(apiClient.post("/money/commitments/friendly", payload));
  },

  evaluateToday() {
    return unwrapData<EvaluateResponse>(apiClient.post("/money/evaluate-today", {}));
  },

  getSummary(limit = 50) {
    return unwrapData<MoneySummaryResponse>(
      apiClient.get("/money/summary", {
        params: { limit },
      })
    );
  },

  removeEntry(id: number, removedReason?: string) {
    return unwrapData<RemoveEntryResponse>(
      apiClient.post(`/money/entries/${id}/remove`, {
        removedReason,
      })
    );
  },
};
