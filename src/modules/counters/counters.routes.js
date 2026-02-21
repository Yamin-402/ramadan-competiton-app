import { Router } from "express";
import { asyncHandler } from "../../core/middleware/async-handler.js";
import { requireAuth } from "../../core/middleware/require-auth.js";
import { getMyCounters } from "./counters.controller.js";

const router = Router();

router.get("/me", requireAuth, asyncHandler(getMyCounters));

export default router;