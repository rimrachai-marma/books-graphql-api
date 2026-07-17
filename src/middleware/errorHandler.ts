import type { Request, Response, NextFunction } from "express";

import { AppError } from "../utils/app-error";

export function errorHandler(error: Error | AppError, req: Request, res: Response, next: NextFunction) {
  console.error("Error:", error);

  let statusCode = 500;
  let message = "Internal server error";
  let errors: Record<string, string[]> | undefined;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    errors = error.errors;
  }

  return res.status(statusCode).json({
    status: "error",
    message: message,
    ...(errors ? { errors } : {}),
    ...(process.env.NODE_ENV === "development" ? { stack: error.stack } : {}),
  });
}

export const routeNotFound = (req: Request, _: Response, next: NextFunction) => {
  const error = new AppError(404, `Not Found - ${req.method} - ${req.originalUrl}`);

  next(error);
};
