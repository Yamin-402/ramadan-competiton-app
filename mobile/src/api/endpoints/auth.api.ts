import { apiClient, unwrapData } from "../client";
import { User } from "../../types/domain";

interface AuthPayload {
  email: string;
  password: string;
}

interface RegisterPayload extends AuthPayload {
  displayName: string;
  audience: "SCHOOL" | "UNIVERSITY";
  schoolSystem?: "EGYPTIAN" | "FOREIGN";
}

interface SessionResponse {
  token: string;
  user: User;
}

export const authApi = {
  createSession(payload: AuthPayload) {
    return unwrapData<SessionResponse>(apiClient.post("/auth/session", payload));
  },

  register(payload: RegisterPayload) {
    return unwrapData<SessionResponse>(apiClient.post("/auth/register", payload));
  },
};
