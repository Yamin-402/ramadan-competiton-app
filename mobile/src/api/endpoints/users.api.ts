import { apiClient, unwrapData } from "../client";
import { PublicUserProfile, User } from "../../types/domain";

interface UpdateProfilePayload {
  displayName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  isStreakPublic?: boolean;
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
};
