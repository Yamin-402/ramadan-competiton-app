import express from "express";
import morgan from "morgan";
import apiRouter from "./routes/index.js";
import { authContext } from "./core/middleware/auth-context.js";
import { notFound } from "./core/middleware/not-found.js";
import { errorHandler } from "./core/middleware/error-handler.js";

const app = express();

app.use(morgan("dev"));
app.use(express.json({ limit: "1mb" }));
app.use(authContext);

app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "ramadan-competition-backend",
    apiBase: "/api/v1",
  });
});

app.use("/api/v1", apiRouter);

app.use(notFound);
app.use(errorHandler);

export default app;