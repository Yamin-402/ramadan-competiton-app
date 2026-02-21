import { AppError } from "../errors/app-error.js";

export function getAuthUserId(auth) {
  if (!auth?.userId) {
    throw new AppError(401, "Authentication required");
  }

  return auth.userId;
}