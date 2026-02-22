import { requestData } from "./http";
import { AdminSession } from "../types";

interface LoginPayload {
  email: string;
  password: string;
}

export const authApi = {
  login(payload: LoginPayload) {
    return requestData<AdminSession>({
      method: "POST",
      url: "/auth/session",
      data: payload,
    });
  },
};
