import { Router } from "express";
import { asyncHandler } from "../../core/middleware/async-handler.js";
import { requireAuth } from "../../core/middleware/require-auth.js";
import {
  getUnreadCount,
  listMyNotifications,
  markMyNotificationRead,
} from "./notifications.controller.js";

const router = Router();

router.get("/unread-count", requireAuth, asyncHandler(getUnreadCount));
router.get("/", requireAuth, asyncHandler(listMyNotifications));
router.post("/:id/read", requireAuth, asyncHandler(markMyNotificationRead));

export default router;
