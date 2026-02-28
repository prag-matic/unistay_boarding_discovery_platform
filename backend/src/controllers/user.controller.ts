import type { Request, Response, NextFunction  } from "express";
import type { User } from '@prisma/client'
import { prisma } from '@/lib/prisma.js'

function sanitizeUser(user: User) {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
}

// GET /api/users/me
export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    

}