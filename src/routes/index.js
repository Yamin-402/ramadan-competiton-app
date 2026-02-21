import { Router } from "express";
import healthRouter from "./health.js";
import authRouter from "../modules/auth/auth.routes.js";
import usersRouter from "../modules/users/users.routes.js";
import tagsRouter from "../modules/tags/tags.routes.js";
import tasksRouter from "../modules/tasks/tasks.routes.js";
import activitiesRouter from "../modules/activities/activities.routes.js";
import countersRouter from "../modules/counters/counters.routes.js";
import leaderboardRouter from "../modules/leaderboard/leaderboard.routes.js";
import streaksRouter from "../modules/streaks/streaks.routes.js";
import notificationsRouter from "../modules/notifications/notifications.routes.js";
import devicesRouter from "../modules/devices/devices.routes.js";
import moneyRouter from "../modules/money/money.routes.js";
import dailyQuestionsRouter from "../modules/daily-questions/daily-questions.routes.js";
import adminRouter from "../modules/admin/admin.routes.js";

const router = Router();

router.use("/health", healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/tags", tagsRouter);
router.use("/tasks", tasksRouter);
router.use("/activities", activitiesRouter);
router.use("/counters", countersRouter);
router.use("/leaderboard", leaderboardRouter);
router.use("/streaks", streaksRouter);
router.use("/notifications", notificationsRouter);
router.use("/devices", devicesRouter);
router.use("/money", moneyRouter);
router.use("/daily-questions", dailyQuestionsRouter);
router.use("/admin", adminRouter);

export default router;
