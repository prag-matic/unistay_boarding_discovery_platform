/**
 * Controllers directory
 *
 * Controllers handle HTTP requests and responses.
 * They should be thin and delegate business logic to services.
 *
 * Structure:
 * - index.ts (exports all controllers)
 * - review.controller.ts
 * - user.controller.ts (future)
 * - auth.controller.ts (future)
 * - boarding.controller.ts (future)
 * - chat.controller.ts (future)
 */

export { ReviewController, reviewController } from "./review.controller.js";
