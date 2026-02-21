import { AppError } from "../errors/app-error.js";

export function requireAuth(req, _res, next) {
  if (!req.auth?.userId) {
    return next(new AppError(401, "Authentication required"));
  }

  next();
}