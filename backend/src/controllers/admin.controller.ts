import type { Request, Response, NextFunction} from 'express';
import { prisma } from '@/lib/prisma.js';
import type { AdminListUsersQuery } from '@/schemas/user.validators.js';
import { Prisma } from '@prisma/client';
import { sendSuccess } from '@/lib/response.js';
import { UserNotFoundError } from '@/errors/AppError.js';

// GET /api/v1/admin/users
export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { page, size, role, active } = req.query as unknown as AdminListUsersQuery;

        const where: Prisma.UserWhereInput = {};
        if (role !== undefined) where.role = role;
        if (active !== undefined) where.isActive = active;

        const [users, total] = await prisma.$transaction([
            prisma.user.findMany({
                where,
                skip: (page - 1) * size,
                take: size,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    phone: true,
                    university: true,
                    nicNumber: true,
                    profileImageUrl: true,
                    isVerified: true,
                    isActive: true,
                    createdAt: true,
                    updatedAt: true,
                },
            }),
            prisma.user.count({ where }),
        ]);

        sendSuccess(res, {
            users, 
            pagination: {
                total,
                page,
                size,
                totalPages: Math.ceil(total / size),
            }
        });

    } catch (error) {
        next(error);
    }
}

// GET /api/v1/admin/users/:id
export async function getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {

        const id = req.params['id'] as string;

        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                phone: true,
                university: true,
                nicNumber: true,
                profileImageUrl: true,
                isVerified: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!user) throw new UserNotFoundError();

        sendSuccess(res, user);

    } catch(error) {
        next(error);
    }
}

// PATCH /api/v1/admin/users/:id/activate
export async function activateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const id = req.params['id'] as string;

        const existing = await prisma.user.findUnique({ 
            where: { id } 
        });

        if (!existing) throw new UserNotFoundError();

        const user = await prisma.user.update({
            where: { id },
            data: { isActive: true },
        });

        sendSuccess(res, { id: user.id, isActive: user.isActive }, 'User activated successfully');

    } catch (err) {
        next(err);
    }
}

// PATCH /api/v1/admin/users/:id/activate
export async function deactivateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const id = req.params['id'] as string;

        const existing = await prisma.user.findUnique({ 
            where: { id } 
        });
        
        if (!existing) throw new UserNotFoundError();

        const user = await prisma.user.update({
            where: { id },
            data: { isActive: false },
        });

        sendSuccess(res, { id: user.id, isActive: user.isActive }, 'User deactivated successfully');

    } catch (err) {
        next(err);
    }
}