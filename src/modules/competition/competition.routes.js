import { Router } from "express";
import { asyncHandler } from "../../core/middleware/async-handler.js";
import { requireAuth } from "../../core/middleware/require-auth.js";
import { getCompetitionState } from "./competition.controller.js";

const router = Router();

router.get("/state", requireAuth, asyncHandler(getCompetitionState));

export default router;
