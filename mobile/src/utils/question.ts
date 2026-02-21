import { DailyQuestionHistoryItem } from "../types/domain";

export function normalizeQuestionOptions(options: unknown): string[] {
  if (Array.isArray(options)) {
    return options.map((item) => String(item));
  }

  if (options && typeof options === "object") {
    return Object.values(options as Record<string, unknown>).map((item) => String(item));
  }

  return [];
}

export function getHistoryDisplayStatus(item: DailyQuestionHistoryItem): string {
  if (item.status === "pending") {
    return "Pending";
  }

  if (item.isCorrect === true) {
    return "Correct";
  }

  if (item.isCorrect === false) {
    return "Wrong";
  }

  return "Revealed";
}
