import express from "express";
import morgan from "morgan";
import apiRouter from "./routes/index.js";
import { authContext } from "./core/middleware/auth-context.js";
import { notFound } from "./core/middleware/not-found.js";
import { errorHandler } from "./core/middleware/error-handler.js";

const app = express();

app.use(morgan("dev"));

// CORS middleware - more permissive for development
app.use((req, res, next) => {
  const origin = req.get("origin");
  
  // Allow specific origins
  const allowedOrigins = [
    "https://mobile-web.fly.dev",
    "https://admin-web.fly.dev",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:8081",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ];

  // Always allow if origin is in the list, or allow all for now
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else if (origin) {
    // For development, allow all origins (can be restricted later)
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-user-id, x-user-role"
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    res.status(200);
    return res.end();
  }

  next();
});

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