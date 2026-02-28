import { prisma } from "../db/prisma.js";
import { AppError } from "../errors/app-error.js";
import { normalizeAdminPermissions } from "../auth/admin-permissions.js";

export async function loadAuthUser(req, _res, next) {
  try {
    if (!req.auth?.userId) {
      return next(new AppError(401, "Authentication required"));
    }

    const user = await prisma.user.findUnique({
      where: { id: req.auth.userId },
      select: {
        id: true,
        role: true,
        isActive: true,
        adminPermissions: true,
      },
    });

    if (!user || !user.isActive) {
      return next(new AppError(401, "Authentication required"));
    }

    req.auth.role = user.role;
    req.auth.adminPermissions = normalizeAdminPermissions(user.adminPermissions);
    return next();
  } catch (error) {
    return next(error);
  }
}
