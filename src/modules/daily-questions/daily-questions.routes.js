import { Router } from "express";
import { asyncHandler } from "../../core/middleware/async-handler.js";
import { requireAuth } from "../../core/middleware/require-auth.js";
import {
  getMyHistory,
  getTodayQuestion,
  submitDailyAnswer,
} from "./daily-questions.controller.js";

const router = Router();

router.get("/today", asyncHandler(getTodayQuestion));
router.get("/my-history", requireAuth, asyncHandler(getMyHistory));
router.post("/:questionId/answers", requireAuth, asyncHandler(submitDailyAnswer));

export default router;
