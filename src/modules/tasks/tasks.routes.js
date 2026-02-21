import { Router } from "express";
import { asyncHandler } from "../../core/middleware/async-handler.js";
import { requireAuth } from "../../core/middleware/require-auth.js";
import { getTaskById, listAvailableTasks } from "./tasks.controller.js";

const router = Router();

router.get("/available", requireAuth, asyncHandler(listAvailableTasks));
router.get("/:taskId", requireAuth, asyncHandler(getTaskById));

export default router;