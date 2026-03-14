import { Router } from "express";
import authRoutes from "@/routes/auth.routes.js";
import userRoutes from "@/routes/user.routes.js";
import adminRoutes from "@/routes/admin.routes.js";
import reviewRoutes from "@/routes/review.routes.js";
import boardingRoutes from "@/routes/boarding.routes.js";
import reservationRouter from "@/routes/reservation.routes.js";
import savedBoardingRoutes from "@/routes/savedBoarding.routes.js";
import visitRequestRoutes from "@/routes/visitRequest.routes.js";
import paymentRoutes from "@/routes/payment.routes.js";

const router = Router();

/**
 * Routes directory
 *
 * Routes define API endpoints and map them to controllers.
 *
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

// Reservation Routes
router.use("/reservation", reservationRouter);

// saved-boarding Routes
router.use('/saved-boardings', savedBoardingRoutes);

// visit-requests routes
router.use('/visit-requests', visitRequestRoutes);

// payments route
router.use('/payments', paymentRoutes);

// Review routes
router.use("/reviews", reviewRoutes);

// Boarding routes (review access via boarding)
router.use("/boardings", reviewRoutes);

export default router;
