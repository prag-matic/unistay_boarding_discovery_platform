import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AppError, ValidationError } from '@/errors/AppError.js';
import { sendError } from '@/lib/response.js';
import { config } from '@/config/env.js';

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

  // Zod validation errors
  if (err instanceof ZodError) {
    const details = err.issues.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    sendError(res, 'ValidationError', 'Validation failed', 422, details);
    return;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    sendError(res, 'UnauthorizedError', 'Invalid token', 401);
    return;
  }
  if (err.name === 'TokenExpiredError') {
    sendError(res, 'TokenExpiredError', 'Token has expired', 401);
    return;
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    handlePrismaError(err, res);
    return;
  }
  // Our custom AppErrors
  if (err instanceof AppError) {
    const details = err instanceof ValidationError ? err.details : undefined;
    sendError(res, err.constructor.name, err.message, err.statusCode, details);
    return;
  }


  // Unexpected errors
  if (config.nodeEnv !== 'production') {
    console.error('[Error]', err);
  }
  sendError(res, 'InternalServerError', 'An unexpected error occurred', 500);

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
      sendError(
        res,
        'ConflictError',
        `A record with this ${target?.join(', ') || 'value'} already exists`,
        409,
      );
      return;

    case "P2025": // Record not found
      sendError(res, 'NotFoundError', 'The requested resource was not found', 404);
      return;

    case "P2003": // Foreign key constraint failed
      sendError(res, 'BadRequestError', 'Invalid reference to related resource', 400);
      return;

    default:
      sendError(res, 'DatabaseError', 'A database error occurred', 500);
      return;
  }
}
