import { apiClient, unwrapData } from "../client";
import { DailyQuestion, DailyQuestionHistoryItem } from "../../types/domain";

interface SubmitAnswerPayload {
  answer: unknown;
}

export const dailyQuestionsApi = {
  getToday() {
    return unwrapData<DailyQuestion | null>(apiClient.get("/daily-questions/today"));
  },

  listHistory(limit = 50) {
    return unwrapData<DailyQuestionHistoryItem[]>(
      apiClient.get("/daily-questions/my-history", {
        params: { limit },
      })
    );
  },

  submitAnswer(questionId: number, payload: SubmitAnswerPayload) {
    return unwrapData<DailyQuestionHistoryItem>(
      apiClient.post(`/daily-questions/${questionId}/answers`, payload)
    );
  },
};
