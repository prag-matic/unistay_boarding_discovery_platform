import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super(`${resource} not found`, 404);
  }
}

/**
 * Bad request error
 */
export class BadRequestError extends AppError {
  constructor(message: string = "Bad request") {
    super(message, 400);
  }
}

/**
 * Unauthorized error
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(message, 401);
  }
}

/**
 * Forbidden error
 */
export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden") {
    super(message, 403);
  }
}

/**
 * Conflict error
 */
export class ConflictError extends AppError {
  constructor(message: string = "Resource already exists") {
    super(message, 409);
  }
}

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // Log error for debugging
  console.error("[Error Handler]", err);

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const errors = err.issues.map((e) => ({
      field: String(e.path.join(".")),
      message: e.message,
    }));

    res.status(400).json({
      success: false,
      error: "ValidationError",
      message: "Validation failed",
      errors,
    });
    return;
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    handlePrismaError(err, res);
    return;
  }

  // Handle AppError (operational errors)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.name,
      message: err.message,
    });
    return;
  }

  // Handle unknown errors (programming errors or other)
  res.status(500).json({
    success: false,
    error: "InternalServerError",
    message:
      process.env.NODE_ENV === "production"
        ? "An unexpected error occurred"
        : err.message,
  });
};

/**
 * Handle Prisma-specific errors
 */
function handlePrismaError(
  error: Prisma.PrismaClientKnownRequestError,
  res: Response,
): void {
  switch (error.code) {
    case "P2002": // Unique constraint failed
      const target = error.meta?.target as string[] | undefined;
      res.status(409).json({
        success: false,
        error: "ConflictError",
        message: `A record with this ${target?.join(", ") || "value"} already exists`,
      });
      break;

    case "P2025": // Record not found
      res.status(404).json({
        success: false,
        error: "NotFoundError",
        message: "The requested resource was not found",
      });
      break;

    case "P2003": // Foreign key constraint failed
      res.status(400).json({
        success: false,
        error: "BadRequestError",
        message: "Invalid reference to related resource",
      });
      break;

    default:
      res.status(500).json({
        success: false,
        error: "DatabaseError",
        message: "A database error occurred",
      });
  }
}
