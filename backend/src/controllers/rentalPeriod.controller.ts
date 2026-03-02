import type { Request, Response, NextFunction } from 'express';
import prisma from '@/lib/prisma.js';
import { sendSuccess } from '@/lib/response.js';
import { ForbiddenError, NotFoundError } from '@/errors/AppError.js';

// GET /api/reservations/:resId/rental-periods  (participant)
export async function getRentalPeriods(req: Request, res: Response, next: NextFunction): Promise<void> {
    
    try {
        
        const { resId } = req.params as { resId: string };
        const userId = req.user!.userId;
        const role = req.user!.role;

        const reservation = await prisma.reservation.findUnique({
            where: { id: resId },
            include: { boarding: true },
        });

    
        if (!reservation) throw new NotFoundError('Reservation not found');

        // Only participant or admin
        if (role !== 'ADMIN') {
            const isStudent = reservation.studentId === userId;
            const isOwner = reservation.boarding.ownerId === userId;
            
            if (!isStudent && !isOwner) {
                throw new ForbiddenError('Access denied');
            }
        }

        const rentalPeriods = await prisma.rentalPeriod.findMany({
            where: { reservationId: resId },
            orderBy: { dueDate: 'asc' },
            select: {
                id: true,
                reservationId: true,
                periodLabel: true,
                dueDate: true,
                amountDue: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                payments: {
                    select: {
                        id: true,
                        amount: true,
                        paymentMethod: true,
                        status: true,
                        paidAt: true,
                        confirmedAt: true,
                    },
                },
            },
        });

        sendSuccess(res, { rentalPeriods });
  
    } catch (err) {
        next(err);
    }
}
