import { Router } from "express";
import authRoutes from "@/routes/auth.routes.js";
import userRoutes from "@/routes/user.routes.js";
import adminRoutes from "@/routes/admin.routes.js";
import reviewRoutes from "@/routes/review.routes.js";
import boardingRoutes from "@/routes/boarding.routes.js";

const router = Router();

/**
 * Routes directory
 *
 * Routes define API endpoints and map them to controllers.
 *
 * Structure:
 * - index.ts (main router - this file)
 * - review.routes.ts
 * - user.routes.ts (future)
 * - auth.routes.ts
 * - boarding.routes.ts (future)
 * - chat.routes.ts (future)
 */

router.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
  });
});

// Authentication Routes
router.use("/auth", authRoutes);

// User Routes
router.use("/users", userRoutes);

// Admin Routes
router.use("/admin", adminRoutes);

// Boarding Routes
router.use("/boardings", boardingRoutes);

// Review routes
router.use("/reviews", reviewRoutes);

// Boarding routes (review access via boarding)
router.use("/boardings", reviewRoutes);

export default router;
