/**
 * Services directory
 *
 * Services contain business logic and data operations.
 * They interact with the database via Mongoose models and external services.
 *
 * Structure:
 * - index.ts (exports all services)
 * - review.service.ts
 * - chatAnalysis.service.ts
 * - user.service.ts (future)
 * - auth.service.ts (future)
 * - boarding.service.ts (future)
 * - chat.service.ts (future)
 */

export { chatAnalysisService } from "./chatAnalysis.service.js";
export { ReviewService, reviewService } from "./review.service.js";
