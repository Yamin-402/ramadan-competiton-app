import { apiClient, unwrapData } from "../client";
import { NotificationRecipient } from "../../types/domain";

interface UnreadCountResponse {
  unreadCount: number;
}

export const notificationsApi = {
  listMine(limit = 40) {
    return unwrapData<NotificationRecipient[]>(
      apiClient.get("/notifications", {
        params: { limit },
      })
    );
  },

  async unreadCount() {
    const response = await unwrapData<UnreadCountResponse>(
      apiClient.get("/notifications/unread-count")
    );
    return response.unreadCount;
  },

  markRead(id: number) {
    return unwrapData<NotificationRecipient>(apiClient.post(`/notifications/${id}/read`));
  },
};
