import { Router } from "express";
import { asyncHandler } from "../../core/middleware/async-handler.js";
import { requireAuth } from "../../core/middleware/require-auth.js";
import { evaluateMyStreaks, getMyStreaks } from "./streaks.controller.js";

const router = Router();

router.post("/evaluate", requireAuth, asyncHandler(evaluateMyStreaks));
router.get("/my", requireAuth, asyncHandler(getMyStreaks));

export default router;

