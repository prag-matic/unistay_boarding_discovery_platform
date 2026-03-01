import { signAccessToken, verifyAccessToken, type JwtPayload } from '@/lib/jwt.js'
import type { Request, Response, NextFunction } from 'express'
import { ForbiddenError, UnauthorizedError } from './errorHandler.js';

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload
        }
    }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    // check if there is a jwt token
    if (!authHeader?.startsWith('Bearer ')){
        return next(new UnauthorizedError('No Token Provided'));
    }

    const token = authHeader.slice(7);

    // verify Token
    try {
        req.user = verifyAccessToken(token);
        next();
    } catch {
        next(new UnauthorizedError('Invalid or expired access token'));
    }
}

export function requireRole(...roles: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        
        if (!req.user) {
            return next(new UnauthorizedError());
        }

        if (!roles.includes(req.user.role)) {
            return next(new ForbiddenError('Insufficient Permissions'));
        }

        next();
    };
}