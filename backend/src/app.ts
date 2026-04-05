import cors from "cors";
import type { Application, Request, Response } from "express";
import express from "express";
import helmet from "helmet";
import { errorHandler } from "./middleware/errorHandler.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import router from "./routes/index.js";
import tileRoutes from "./routes/tile.routes.js";

const app: Application = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Tile proxy – mounted outside /api so tile requests use their own generous
// rate limit instead of the stricter API limiter.
app.use("/tiles", tileRoutes);

// Rate limiting
app.use("/api", apiLimiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use("/api", router);

// 404 handler
app.use((_req: Request, res: Response) => {
	res.status(404).json({
		success: false,
		error: "NotFound",
		message: "The requested resource was not found",
		timestamp: new Date().toISOString(),
	});
});

// Global error handler
app.use(errorHandler);

export default app;
