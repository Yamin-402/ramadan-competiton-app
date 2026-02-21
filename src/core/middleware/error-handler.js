import { AppError } from "../errors/app-error.js";

export function errorHandler(error, _req, res, _next) {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: {
        message: error.message,
        details: error.details,
      },
    });
  }

  if (error?.name === "ZodError") {
    return res.status(400).json({
      error: {
        message: "Validation failed",
        details: error.issues,
      },
    });
  }

  console.error(error);

  return res.status(500).json({
    error: {
      message: "Internal server error",
    },
  });
}