import { Router } from "express";
import { asyncHandler } from "../../core/middleware/async-handler.js";
import { getLeaderboard } from "./leaderboard.controller.js";

const router = Router();

router.get("/", asyncHandler(getLeaderboard));
router.get("/public", asyncHandler(getLeaderboard));

export default router;
