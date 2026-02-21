import {
  listNotificationsQuerySchema,
  notificationParamsSchema,
} from "./notifications.validator.js";
import { notificationsService } from "./notifications.service.js";

export async function listMyNotifications(req, res) {
  const query = listNotificationsQuerySchema.parse(req.query);
  const data = await notificationsService.listMyNotifications(req.auth, query);

  res.status(200).json({ data });
}

export async function getUnreadCount(req, res) {
  const data = await notificationsService.getUnreadCount(req.auth);

  res.status(200).json({ data });
}

export async function markMyNotificationRead(req, res) {
  const { id } = notificationParamsSchema.parse(req.params);
  const data = await notificationsService.markMyNotificationRead(req.auth, id);

  res.status(200).json({ data });
}
