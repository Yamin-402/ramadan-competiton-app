import { prisma } from "../../core/db/prisma.js";

export const notificationsRepository = {
  listByUser(userId, limit) {
    return prisma.notificationRecipient.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit,
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            body: true,
            status: true,
            sentAt: true,
            createdAt: true,
          },
        },
      },
    });
  },
  countUnreadByUser(userId) {
    return prisma.notificationRecipient.count({
      where: {
        userId,
        readAt: null,
      },
    });
  },

  async markAsRead(userId, recipientId) {
    await prisma.notificationRecipient.updateMany({
      where: {
        id: recipientId,
        userId,
      },
      data: {
        readAt: new Date(),
      },
    });

    return prisma.notificationRecipient.findFirst({
      where: {
        id: recipientId,
        userId,
      },
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            body: true,
            status: true,
            sentAt: true,
            createdAt: true,
          },
        },
      },
    });
  },
};
