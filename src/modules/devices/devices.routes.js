import { Router } from "express";
import { asyncHandler } from "../../core/middleware/async-handler.js";
import { requireAuth } from "../../core/middleware/require-auth.js";
import { registerDevice } from "./devices.controller.js";

const router = Router();

router.post("/register", requireAuth, asyncHandler(registerDevice));

export default router;

