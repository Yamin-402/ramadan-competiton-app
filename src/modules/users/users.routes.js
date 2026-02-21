import { Router } from "express";
import { asyncHandler } from "../../core/middleware/async-handler.js";
import { requireAuth } from "../../core/middleware/require-auth.js";
import {
  getMyProfile,
  getPublicProfile,
  updateMyProfile,
  updateMyTags,
} from "./users.controller.js";

const router = Router();

router.get("/me", requireAuth, asyncHandler(getMyProfile));
router.patch("/me/profile", requireAuth, asyncHandler(updateMyProfile));
router.patch("/me/tags", requireAuth, asyncHandler(updateMyTags));
router.get("/public/:id", requireAuth, asyncHandler(getPublicProfile));

export default router;
