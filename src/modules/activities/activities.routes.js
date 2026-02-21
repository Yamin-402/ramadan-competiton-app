import { Router } from "express";
import { asyncHandler } from "../../core/middleware/async-handler.js";
import { requireAuth } from "../../core/middleware/require-auth.js";
import {
  createTaskCompletion,
  getFastingStatus,
  getTodayTaskStatus,
  listMyActivities,
} from "./activities.controller.js";

const router = Router();

router.get("/me", requireAuth, asyncHandler(listMyActivities));
router.get("/fasting-status", requireAuth, asyncHandler(getFastingStatus));
router.get("/today-task-status", requireAuth, asyncHandler(getTodayTaskStatus));
router.post("/task-completions", requireAuth, asyncHandler(createTaskCompletion));

export default router;
