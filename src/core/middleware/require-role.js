import { AppError } from "../errors/app-error.js";

export function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.auth?.userId) {
      return next(new AppError(401, "Authentication required"));
    }

    if (!allowedRoles.includes(req.auth.role)) {
      return next(new AppError(403, "Insufficient role"));
    }

    next();
  };
}