import { AppError } from "../../core/errors/app-error.js";
import { getAuthUserId } from "../../core/utils/get-auth-user-id.js";
import { notificationsRepository } from "./notifications.repository.js";

export const notificationsService = {
  listMyNotifications(auth, query) {
    const userId = getAuthUserId(auth);
    return notificationsRepository.listByUser(userId, query.limit);
  },
  async getUnreadCount(auth) {
    const userId = getAuthUserId(auth);
    const unreadCount = await notificationsRepository.countUnreadByUser(userId);

    return { unreadCount };
  },

  async markMyNotificationRead(auth, recipientId) {
    const userId = getAuthUserId(auth);
    const row = await notificationsRepository.markAsRead(userId, recipientId);

    if (!row) {
      throw new AppError(404, "Notification not found");
    }

    return row;
  },
};
