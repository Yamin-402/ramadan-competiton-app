import { AppError } from "../errors/app-error.js";

export function requireAdminPermission(permissionKey) {
  return (req, _res, next) => {
    if (!req.auth?.userId) {
      return next(new AppError(401, "Authentication required"));
    }

    if (req.auth.role === "SUPER_ADMIN") {
      return next();
    }

    if (req.auth.role !== "ADMIN") {
      return next(new AppError(403, "Insufficient role"));
    }

    const permissions = Array.isArray(req.auth.adminPermissions)
      ? req.auth.adminPermissions
      : null;

    // Backward-compatible: admins without explicit permissions keep full access.
    if (permissions === null) {
      return next();
    }

    if (!permissions.includes(permissionKey)) {
      return next(new AppError(403, "Insufficient admin permission"));
    }

    return next();
  };
}

