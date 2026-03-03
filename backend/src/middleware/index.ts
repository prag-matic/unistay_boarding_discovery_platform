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
  validate,
  validateBody,
  validateParams,
  validateQuery,
} from "./validate.js";

export { errorHandler } from "@/middleware/errorHandler.js"

export {
  AppError,
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
} from "@/errors/AppError.js";
export { uploadReviewMedia, validateReviewFiles } from "./upload.js";
