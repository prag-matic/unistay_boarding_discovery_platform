import type { NextFunction, Request, Response } from "express";
import { ForbiddenError, UnauthorizedError } from "@/errors/AppError.js";
import { type JwtPayload, verifyAccessToken } from "@/lib/jwt.js";

declare global {
	namespace Express {
		interface Request {
			user?: JwtPayload;
		}
	}
}

export function authenticate(
	req: Request,
	_res: Response,
	next: NextFunction,
): void {
	const authHeader = req.headers.authorization;

	// check if there is a jwt token
	if (!authHeader?.startsWith("Bearer ")) {
		next(new UnauthorizedError("No Token Provided"));
		return;
	}

	// get token from the header value
	const token = authHeader.slice(7);

	// verify Token
	try {
		req.user = verifyAccessToken(token);
		next();
	} catch {
		next(new UnauthorizedError("Invalid or expired access token"));
	}
}

export function requireRole(...roles: string[]) {
	return (req: Request, _res: Response, next: NextFunction): void => {
		if (!req.user) {
			next(new UnauthorizedError());
			return;
		}

		if (!roles.includes(req.user.role)) {
			next(new ForbiddenError("Insufficient Permissions"));
			return;
		}

		next();
	};
}
