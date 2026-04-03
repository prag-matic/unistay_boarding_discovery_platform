/**
 * Middleware directory
 *
 * Middleware functions process requests before they reach controllers.
 *
 * Structure:
 * - index.ts (exports all middleware)
 * - auth.ts (future - authentication)
 * - validate.ts (Zod validation)
 * - errorHandler.ts (Global error handling)
 * - upload.ts (File upload handling)
 */

export {
	AppError,
	BadRequestError,
	ConflictError,
	ForbiddenError,
	NotFoundError,
	UnauthorizedError,
} from "@/errors/AppError.js";

export { errorHandler } from "@/middleware/errorHandler.js";
export { uploadReviewMedia, validateReviewFiles } from "./upload.js";
export {
	validate,
	validateBody,
	validateParams,
	validateQuery,
} from "./validate.js";
