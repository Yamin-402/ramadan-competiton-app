import { Router } from "express";
import { asyncHandler } from "../../core/middleware/async-handler.js";
import { requireAuth } from "../../core/middleware/require-auth.js";
import {
  createCommitment,
  createFriendlyCommitment,
  evaluateToday,
  getSummary,
  listCommitments,
  removeEntry,
} from "./money.controller.js";

const router = Router();

router.post("/commitments", requireAuth, asyncHandler(createCommitment));
router.post("/commitments/friendly", requireAuth, asyncHandler(createFriendlyCommitment));
router.get("/commitments", requireAuth, asyncHandler(listCommitments));
router.post("/evaluate-today", requireAuth, asyncHandler(evaluateToday));
router.get("/summary", requireAuth, asyncHandler(getSummary));
router.post("/entries/:id/remove", requireAuth, asyncHandler(removeEntry));

export default router;
