import rateLimit from "express-rate-limit";

export const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // Limit each IP to 100 requests per windowMs
	message: {
		success: false,
		error: "TooManyRequests",
		message: "Too many requests from this IP, please try again later",
	},
	standardHeaders: true,
	legacyHeaders: false,
});

export const loginLimiter = rateLimit({
	windowMs: 60 * 1000, // 1 minute
	max: 5,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		success: false,
		error: "TooManyRequests",
		message: "Too many login attempts. Please try again after 1 minute.",
		timestamp: new Date().toISOString(),
	},
});

export const emailLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 5,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		success: false,
		error: "TooManyRequests",
		message: "Too many requests. Please try again later.",
		timestamp: new Date().toISOString(),
	},
});

export const refreshLimiter = rateLimit({
	windowMs: 60 * 1000, // 1 minute
	max: 10,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		success: false,
		error: "TooManyRequests",
		message: "Too many token refresh attempts. Please try again later.",
		timestamp: new Date().toISOString(),
	},
});

export const userLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		success: false,
		error: "TooManyRequests",
		message: "Too many requests. Please try again later.",
		timestamp: new Date().toISOString(),
	},
});

export const adminLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 200,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		success: false,
		error: "TooManyRequests",
		message: "Too many requests. Please try again later.",
		timestamp: new Date().toISOString(),
	},
});

export const boardingLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 300,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		success: false,
		error: "TooManyRequests",
		message: "Too many requests. Please try again later.",
		timestamp: new Date().toISOString(),
	},
});

export const reservationLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 200,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		success: false,
		error: "TooManyRequests",
		message: "Too many requests. Please try again later.",
		timestamp: new Date().toISOString(),
	},
});

export const savedBoardingLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 200,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		success: false,
		error: "TooManyRequests",
		message: "Too many requests. Please try again later.",
		timestamp: new Date().toISOString(),
	},
});

export const visitRequestLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 200,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		success: false,
		error: "TooManyRequests",
		message: "Too many requests. Please try again later.",
		timestamp: new Date().toISOString(),
	},
});

export const paymentLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 200,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		success: false,
		error: "TooManyRequests",
		message: "Too many requests. Please try again later.",
		timestamp: new Date().toISOString(),
	},
});
