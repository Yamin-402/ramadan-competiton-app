import { prisma } from "../../core/db/prisma.js";

export const devicesRepository = {
  upsertDevice({ userId, pushToken, platform }) {
    const now = new Date();
    return prisma.userDevice.upsert({
      where: { pushToken },
      update: {
        userId,
        platform,
        isActive: true,
        lastSeenAt: now,
      },
      create: {
        userId,
        pushToken,
        platform,
        isActive: true,
        lastSeenAt: now,
      },
    });
  },
};

