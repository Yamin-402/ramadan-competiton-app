import { apiClient, unwrapData } from "../client";
import { AiUserReport, PublicUserProfile, User } from "../../types/domain";

interface UpdateProfilePayload {
  displayName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  isStreakPublic?: boolean;
}

interface GenerateAiReportPayload {
  lookbackDays: number;
  reportLength: "SHORT" | "MEDIUM" | "LONG";
  focusMode: "SUMMARY" | "COMPARISON" | "BOTH";
  language: "AR" | "EN";
  tone: "MOTIVATIONAL" | "BALANCED" | "STRICT";
  includeDailyQuestions: boolean;
  includeTiming: boolean;
  includeTopTasks: boolean;
  includeStreaks: boolean;
}

export const usersApi = {
  getMyProfile() {
    return unwrapData<User>(apiClient.get("/users/me"));
  },

  updateMyProfile(payload: UpdateProfilePayload) {
    return unwrapData<User>(apiClient.patch("/users/me/profile", payload));
  },

  getPublicProfile(userId: number) {
    return unwrapData<PublicUserProfile>(apiClient.get(`/users/public/${userId}`));
  },

  generateMyAiReport(payload: GenerateAiReportPayload) {
    return unwrapData<AiUserReport>(apiClient.post("/users/me/ai-report", payload));
  },
};
