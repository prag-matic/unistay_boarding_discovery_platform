import jwt from "jsonwebtoken";
import { config } from "@/config/env.js";

export interface JwtPayload {
	userId: string;
	role: string;
	email: string;
}

export function signAccessToken(payload: JwtPayload): string {
	return jwt.sign(payload, config.jwt.accessSecret, {
		expiresIn: config.jwt.accessExpiry as jwt.SignOptions["expiresIn"],
	});
}

export function signRefreshToken(payload: JwtPayload): string {
	return jwt.sign(payload, config.jwt.refreshSecret, {
		expiresIn: config.jwt.refreshExpiry as jwt.SignOptions["expiresIn"],
	});
}

export function verifyAccessToken(token: string): JwtPayload {
	return jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
	return jwt.verify(token, config.jwt.refreshSecret) as JwtPayload;
}

export function decodeToken(token: string): JwtPayload | null {
	const decoded = jwt.decode(token);
	if (!decoded || typeof decoded === "string") return null;
	return decoded as JwtPayload;
}

// Parse a duration string like "15m", "30d" into milliseconds
export function parseDurationMs(duration: string): number {
	const unit = duration.slice(-1);
	const value = parseInt(duration.slice(0, -1), 10);
	switch (unit) {
		case "s":
			return value * 1000;
		case "m":
			return value * 60 * 1000;
		case "h":
			return value * 60 * 60 * 1000;
		case "d":
			return value * 24 * 60 * 60 * 1000;
		default:
			return value * 1000;
	}
}
