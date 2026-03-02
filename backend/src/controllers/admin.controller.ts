import type { Request, Response, NextFunction} from 'express';
import { prisma } from '@/lib/prisma.js';
import type { AdminListUsersQuery } from '@/schemas/user.validators.js';
import type { RejectBoardingInput } from '@/schemas/boarding.validators.js';
import { Prisma, BoardingStatus } from '@prisma/client';
import { sendSuccess } from '@/lib/response.js';
import { UserNotFoundError, BoardingNotFoundError, InvalidStateTransitionError } from '@/errors/AppError.js';
import { boardingSelect } from './boarding.controller.js';

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

// GET /api/admin/users/:id
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

// PATCH /api/admin/users/:id/activate
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

// PATCH /api/admin/users/:id/activate
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

// GET /api/admin/boardings/pending
export async function listPendingBoardings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {

        const boardings = await prisma.boarding.findMany({
            where: { status: BoardingStatus.PENDING_APPROVAL, isDeleted: false },
            orderBy: { updatedAt: 'asc' },
            select: boardingSelect(),
        });

        sendSuccess(res, { boardings });

    } catch (err) {
        next(err);
    }
}

// PATCH /api/admin/boardings/:id/approve
export async function approveBoarding(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { id } = req.params as { id: string };

        const existing = await prisma.boarding.findUnique({ where: { id } });
    
        if (!existing || existing.isDeleted) throw new BoardingNotFoundError();

        if (existing.status !== BoardingStatus.PENDING_APPROVAL) {
            throw new InvalidStateTransitionError('Only PENDING_APPROVAL listings can be approved');
        }

        const boarding = await prisma.boarding.update({
            where: { id },
            data: { status: BoardingStatus.ACTIVE, rejectionReason: null },
            select: { id: true, status: true, title: true, updatedAt: true },
        });

        sendSuccess(res, { boarding }, 'Boarding approved successfully');
    
    } catch (err) {
        next(err);
    }
}

// PATCH /api/admin/boardings/:id/reject
export async function rejectBoarding(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { id } = req.params as { id: string };
        const { reason } = req.body as RejectBoardingInput;

        const existing = await prisma.boarding.findUnique({ where: { id } });
        
        if (!existing || existing.isDeleted) throw new BoardingNotFoundError();

        if (existing.status !== BoardingStatus.PENDING_APPROVAL) {
            throw new InvalidStateTransitionError('Only PENDING_APPROVAL listings can be rejected');
        }

        const boarding = await prisma.boarding.update({
            where: { id },
            data: { 
                status: BoardingStatus.REJECTED, 
                rejectionReason: reason 
            },
            
            select: { 
                id: true, 
                status: true, 
                title: true, 
                rejectionReason: true, 
                updatedAt: true },
        });

        sendSuccess(res, { boarding }, 'Boarding rejected successfully');
    
    } catch (err) {
        next(err);
    }
}