import type { Request, Response, NextFunction } from 'express';
import prisma from '@/lib/prisma.js';
import { sendSuccess } from '@/lib/response.js';

import type { 
    CreateReservationInput, 
} from "@/schemas/reservation.validators.js"

import { 
    BadRequestError, 
    BoardingNotFoundError,
    ConflictError,
    NotFoundError,
    ForbiddenError,
} from "@/errors/AppError.js";

import { Prisma, BoardingStatus, ReservationStatus } from '@prisma/client'; 

const RESERVATION_EXPIRY_HOURS = 72;

function reservationSelect() {
    return {
        id: true,
        studentId: true,
        boardingId: true,
        status: true,
        moveInDate: true,
        specialRequests: true,
        rentSnapshot: true,
        boardingSnapshot: true,
        rejectionReason: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,

        student: { 
            select: {
                id: true, 
                firstName: true, 
                lastName: true, 
                email: true 
            }
        },

        boarding: { 
            select: { 
                id: true, 
                title: true, 
                slug: true, 
                city: true, 
                district: true 
            }
        },

    } as const;
}

// Helper: generate rental periods for an active reservation
async function generateRentalPeriods(
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
    reservationId: string,
    moveInDate: Date,
    monthlyRent: number,
): Promise<void> {

    // First period: due_date = move_in_date (formatted YYYY-MM-DD label)
    const firstDue = new Date(moveInDate);
    firstDue.setUTCHours(0, 0, 0, 0);

    const formatPeriodLabel = (d: Date) =>
        `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

    // Generate 12 months of upcoming rental periods
    const periods = [];
    
    for (let i = 0; i < 12; i++) {
        let dueDate: Date;
        
        if (i === 0) {
            dueDate = new Date(firstDue);
        } else {
            dueDate = new Date(firstDue);
            dueDate.setUTCMonth(firstDue.getUTCMonth() + i);
            dueDate.setUTCDate(1);
    }

        periods.push({
            reservationId,
            periodLabel: formatPeriodLabel(dueDate),
            dueDate,
            amountDue: monthlyRent,
        });
    }

    await tx.rentalPeriod.createMany({ data: periods });
}

// POST /api/reservations
export async function createReservation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        
        const studentId = req.user!.userId;
        const body = req.body as CreateReservationInput;

        // Validate move-in date >= today + 1 day
        const today = new Date();
        
        today.setUTCHours(0, 0, 0, 0);
        
        const minMoveIn = new Date(today);
        
        minMoveIn.setUTCDate(minMoveIn.getUTCDate() + 1);

        const moveInDate = new Date(body.moveInDate);
        
        moveInDate.setUTCHours(0, 0, 0, 0);
    
        if (moveInDate < minMoveIn) {
            throw new BadRequestError('Move-in date must be at least 1 day in the future');
        }

        const reservation = await prisma.$transaction(async (tx) => {
      
        // Lock boarding row
        const boarding = await tx.boarding.findUnique({ where: { id: body.boardingId } });
        
        if (!boarding || boarding.isDeleted) throw new BoardingNotFoundError();
        
        if (boarding.status !== BoardingStatus.ACTIVE) {
            throw new BadRequestError('Boarding is not available for reservation');
        }

        // Occupancy check
        if (boarding.currentOccupants >= boarding.maxOccupants) {
            throw new ConflictError('Boarding is full');
        }

        // Student already has active reservation globally
        const activeReservation = await tx.reservation.findFirst({
            where: { studentId, status: ReservationStatus.ACTIVE },
        });

        if (activeReservation) {
            throw new ConflictError('You already have an active reservation');
        }

        // Student already has pending/active for this boarding
        const existingForBoarding = await tx.reservation.findFirst({
            where: {
                studentId,
                boardingId: body.boardingId,
                status: { in: [ReservationStatus.PENDING, ReservationStatus.ACTIVE] },
            },
        });

        if (existingForBoarding) {
            throw new ConflictError('You already have a pending or active reservation for this boarding');
        }

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + RESERVATION_EXPIRY_HOURS);

        const boardingSnapshot = {
            id: boarding.id,
            title: boarding.title,
            slug: boarding.slug,
            city: boarding.city,
            district: boarding.district,
            address: boarding.address,
            boardingType: boarding.boardingType,
            genderPref: boarding.genderPref,
            monthlyRent: boarding.monthlyRent,
            maxOccupants: boarding.maxOccupants,
            nearUniversity: boarding.nearUniversity,
        };

        return tx.reservation.create({
            data: {
                studentId,
                boardingId: body.boardingId,
                moveInDate,
                specialRequests: body.specialRequests,
                rentSnapshot: boarding.monthlyRent,
                boardingSnapshot,
                expiresAt,
            },

            select: reservationSelect(),

        });

    });

    sendSuccess(res, { reservation }, 'Reservation request created successfully', 201);

  } catch (err) {
    next(err);
  }
}

// GET /api/reservations/my-requests  (student)
export async function getMyRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    
    try {
        const studentId = req.user!.userId;

        const reservations = await prisma.reservation.findMany({
            where: { studentId },
            orderBy: { createdAt: 'desc' },
            select: reservationSelect(),
        });

        sendSuccess(res, { reservations });

    } catch (err) {
        next(err);
    }
}

// GET /api/reservations/my-boardings  (owner)
export async function getMyBoardingRequests(req: Request, res: Response, next: NextFunction): Promise<void> {

    try {
        const ownerId = req.user!.userId;

        const reservations = await prisma.reservation.findMany({
            where: { boarding: { ownerId } },
            orderBy: { createdAt: 'desc' },
            select: reservationSelect(),
        });

        sendSuccess(res, { reservations });

    } catch (err) {
        next(err);
    }
}

// GET /api/reservations/:id
export async function getReservationById(req: Request, res: Response, next: NextFunction): Promise<void> {
    
    try {
        const { id } = req.params as { id: string };
        const userId = req.user!.userId;
        const role = req.user!.role;

        const reservation = await prisma.reservation.findUnique({
            where: { id },
            select: reservationSelect(),
        });

        if (!reservation) throw new NotFoundError('Reservation not found');

        // Only participant (student or owner) can access
        if (role !== 'ADMIN') {
            const isStudent = reservation.studentId === userId;
            
            if (!isStudent) {
                const boarding = await prisma.boarding.findUnique({ where: { id: reservation.boardingId } });
                
                if (!boarding || boarding.ownerId !== userId) {
                        throw new ForbiddenError('Access denied');
                }
            }
        }

        sendSuccess(res, { reservation });

    } catch (err) {
        next(err);
    }
}

// PATCH /api/reservations/:id/approve  (owner)
export async function approveReservation(req: Request, res: Response, next: NextFunction): Promise<void> {

    try {

        const { id } = req.params as { id: string };
        const ownerId = req.user!.userId;

        const reservation = await prisma.$transaction(async (tx) => {
        
            const res = await tx.reservation.findUnique({
                where: { id },
                include: { boarding: true },
            });

            if (!res) throw new NotFoundError('Reservation not found');
            
            if (res.boarding.ownerId !== ownerId) {
                throw new ForbiddenError('You do not own this boarding');
            }
        
            if (res.status !== ReservationStatus.PENDING) {
                throw new BadRequestError('Only PENDING reservations can be approved');
            }

            // Check if expired
            if (new Date() > res.expiresAt) {
                await tx.reservation.update({ where: { id }, data: { status: ReservationStatus.EXPIRED } });
                throw new BadRequestError('Reservation has expired');
            }

            // Re-check occupancy
            if (res.boarding.currentOccupants >= res.boarding.maxOccupants) {
                throw new ConflictError('Boarding is full');
            }

            // Increment occupants
            await tx.boarding.update({
                where: { id: res.boardingId },
                data: { currentOccupants: { increment: 1 } },
            });

            const updated = await tx.reservation.update({
                where: { id },
                data: { status: ReservationStatus.ACTIVE },
                select: reservationSelect(),
            });

            // Generate rental periods
            await generateRentalPeriods(tx, id, res.moveInDate, res.rentSnapshot);

            return updated;
        });

        sendSuccess(res, { reservation }, 'Reservation approved');

    } catch (err) {
        next(err);
    }
}

