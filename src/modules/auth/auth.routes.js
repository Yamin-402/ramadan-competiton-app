import { Router } from "express";
import { asyncHandler } from "../../core/middleware/async-handler.js";
import { register, createSession } from "./auth.controller.js";

const router = Router();

router.post("/register", asyncHandler(register));
router.post("/session", asyncHandler(createSession));

export default router;