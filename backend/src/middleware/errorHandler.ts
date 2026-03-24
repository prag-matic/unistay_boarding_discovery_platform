import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { config } from "@/config/env.js";
import { AppError, ValidationError } from "@/errors/AppError.js";
import { sendError } from "@/lib/response.js";

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
			field: e.path.join("."),
			message: e.message,
		}));
		sendError(res, "ValidationError", "Validation failed", 422, details);
		return;
	}

	// JWT errors
	if (err.name === "JsonWebTokenError") {
		sendError(res, "UnauthorizedError", "Invalid token", 401);
		return;
	}
	if (err.name === "TokenExpiredError") {
		sendError(res, "TokenExpiredError", "Token has expired", 401);
		return;
	}

	// Handle Mongoose errors
	if (err instanceof mongoose.Error.ValidationError) {
		handleMongooseValidationError(err, res);
		return;
	}
	if (err instanceof mongoose.Error.CastError) {
		sendError(res, "BadRequestError", "Invalid ID format", 400);
		return;
	}
	if (
		typeof err === "object" &&
		err !== null &&
		"code" in err &&
		(err as { code: unknown }).code === 11000
	) {
		handleDuplicateKeyError(err as { keyValue?: Record<string, unknown> }, res);
		return;
	}
	if (err instanceof mongoose.Error) {
		sendError(res, "DatabaseError", "A database error occurred", 500);
		return;
	}

	// Our custom AppErrors
	if (err instanceof AppError) {
		const details = err instanceof ValidationError ? err.details : undefined;
		sendError(res, err.constructor.name, err.message, err.statusCode, details);
		return;
	}

	// Unexpected errors
	if (config.nodeEnv !== "production") {
		console.error("[Error]", err);
	}
	sendError(res, "InternalServerError", "An unexpected error occurred", 500);
};

/**
 * Handle Mongoose validation errors
 */
function handleMongooseValidationError(
	error: mongoose.Error.ValidationError,
	res: Response,
): void {
	const details = Object.values(error.errors).map((err) => ({
		field: err.path,
		message: err.message,
	}));
	sendError(res, "ValidationError", "Validation failed", 422, details);
}

/**
 * Handle MongoDB duplicate key errors
 */
function handleDuplicateKeyError(
	error: { keyValue?: Record<string, unknown> },
	res: Response,
): void {
	const field = Object.keys(error.keyValue || {})[0];
	sendError(
		res,
		"ConflictError",
		`A record with this ${field || "value"} already exists`,
		409,
	);
}
