import { Router } from "express";
import { asyncHandler } from "../../core/middleware/async-handler.js";
import { listTags } from "./tags.controller.js";

const router = Router();

router.get("/", asyncHandler(listTags));

export default router;