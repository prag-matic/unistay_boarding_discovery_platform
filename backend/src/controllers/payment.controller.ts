import type { Request, Response, NextFunction } from 'express';
import prisma from '@/lib/prisma.js';
import { sendSuccess } from '@/lib/response.js';
import { uploadPaymentProofImage } from '@/lib/cloudinary.js';

import {
  	ForbiddenError,
  	ConflictError,
  	NotFoundError,
	UnauthorizedError,
  	BadRequestError,
} from '@/errors/AppError.js';

import type { 
	LogPaymentInput, 
	RejectPaymentInput 
} from '@/schemas/payment.validators.js';

import { 
	Prisma, 
	PaymentStatus, 
	RentalPeriodStatus 
} from '@prisma/client';

function paymentSelect() {
  	return {
    	id: true,
    	rentalPeriodId: true,
    	reservationId: true,
    	studentId: true,
		student: {
			select: {
				id: true,
				firstName: true,
				lastName: true,
				email: true,
			},
		},
		rentalPeriod: {
			select: {
				id: true,
				periodLabel: true,
				dueDate: true,
				amountDue: true,
				status: true,
			},
		},
		reservation: {
			select: {
				id: true,
				status: true,
				moveInDate: true,
				boardingId: true,
				boarding: {
					select: {
						id: true,
						title: true,
					},
				},
			},
		},
    	amount: true,
    	paymentMethod: true,
    	referenceNumber: true,
    	proofImageUrl: true,
    	status: true,
    	paidAt: true,
    	rejectionReason: true,
    	confirmedAt: true,
    	createdAt: true,
    	updatedAt: true,
  	} as const;
}

async function recalcRentalPeriodStatus(
  	tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  	rentalPeriodId: string,
): Promise<void> {

  	const period = await tx.rentalPeriod.findUnique({
    	where: { id: rentalPeriodId },
    	include: { payments: true },
  	});
  
	if (!period) return;

  	const confirmedTotal = period.payments
    	.filter((p) => p.status === PaymentStatus.CONFIRMED)
    	.reduce((sum, p) => sum.add(p.amount), new Prisma.Decimal(0));

  	let newStatus = period.status;
  	
	if (confirmedTotal.gte(period.amountDue)) {
    	newStatus = RentalPeriodStatus.PAID;
  	} else if (confirmedTotal.gt(0)) {
    	newStatus = RentalPeriodStatus.PARTIALLY_PAID;
  	}

  	if (newStatus !== period.status) {
    	await tx.rentalPeriod.update({
      		where: { id: rentalPeriodId },
      		data: { status: newStatus },
    	});
  	}
}

// POST /api/payments  (student)
export async function logPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  	try {
    	const studentId = req.user!.userId;
    	const body = req.body as LogPaymentInput;

    	const paidAt = new Date(body.paidAt);
    
		if (paidAt > new Date()) {
      		throw new BadRequestError('paidAt cannot be in the future');
    	}

    	const payment = await prisma.$transaction(async (tx) => {
      	const rentalPeriod = await tx.rentalPeriod.findUnique({
        	where: { id: body.rentalPeriodId },
        	include: { payments: true },
      	});
      
		if (!rentalPeriod) throw new NotFoundError('Rental period not found');

      	const reservation = await tx.reservation.findUnique({
        	where: { id: body.reservationId },
      	});

      	if (!reservation) throw new NotFoundError('Reservation not found');
      	
		if (reservation.studentId !== studentId) {
        	throw new ForbiddenError('You are not the student on this reservation');
      	}
      
		if (rentalPeriod.reservationId !== body.reservationId) {
        	throw new BadRequestError('Rental period does not belong to this reservation');
      	}
      	
		if (rentalPeriod.status === RentalPeriodStatus.PAID) {
        	throw new ConflictError('Rental period is already fully paid');
      	}

      	// Calculate remaining balance
      	const confirmedTotal = rentalPeriod.payments
        	.filter((p) => p.status === PaymentStatus.CONFIRMED)
        	.reduce((sum, p) => sum.add(p.amount), new Prisma.Decimal(0));
      	
		const remaining = new Prisma.Decimal(rentalPeriod.amountDue).sub(confirmedTotal);

      	if (new Prisma.Decimal(body.amount).gt(remaining)) {
        	throw new BadRequestError(
          		`Amount exceeds remaining balance of ${remaining.toFixed(2)}`,
        	);
      	}

      	return tx.payment.create({
        	data: {
          		rentalPeriodId: body.rentalPeriodId,
          		reservationId: body.reservationId,
          		studentId,
          		amount: new Prisma.Decimal(body.amount),
          		paymentMethod: body.paymentMethod,
          		referenceNumber: body.referenceNumber,
          		proofImageUrl: body.proofImageUrl,
          		paidAt,
        	},

        	select: paymentSelect(),

		});
    });

    sendSuccess(res, { payment }, 'Payment logged successfully', 201);
  
	} catch (err) {
    	next(err);
  	}
}

// GET /api/v1/payments/my-payments  (student)
export async function getMyPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
  	try {
    	const studentId = req.user!.userId;

    	const payments = await prisma.payment.findMany({
      		where: { studentId },
      		orderBy: { createdAt: 'desc' },
      		select: paymentSelect(),
   	 	});

    	sendSuccess(res, { payments });
  	
	} catch (err) {
    	next(err);
  	}
}

// GET /api/payments/my-boardings  (owner)
export async function getMyBoardingPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
  	
	try {
    	
		const ownerId = req.user!.userId;

    	const payments = await prisma.payment.findMany({
      		where: { reservation: { boarding: { ownerId } } },
      		orderBy: { createdAt: 'desc' },
	      	select: paymentSelect(),
    	});

    	sendSuccess(res, { payments });
  
	} catch (err) {
    	next(err);
  	}
}

// PATCH /api/v1/payments/:id/confirm  (owner)
export async function confirmPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  	try {
    	const { id } = req.params as { id: string };
    	const ownerId = req.user!.userId;

    	const existing = await prisma.payment.findUnique({
      		where: { id },
     		include: { 
				reservation: { 
					include: { 
						boarding: true 
					} 
				} 
			},
    	});

    	if (!existing) throw new NotFoundError('Payment not found');
    
		if (existing.reservation.boarding.ownerId !== ownerId) {
      		throw new ForbiddenError('You do not own this boarding');
    	}
    	
		if (existing.status !== PaymentStatus.PENDING) {
      		throw new BadRequestError('Only PENDING payments can be confirmed');
    	}

    	await prisma.$transaction(async (tx) => {
      		await tx.payment.update({
        		where: { id },
        		data: { 
					status: PaymentStatus.CONFIRMED, 
					confirmedAt: new Date() 
				},
      		});
      
			await recalcRentalPeriodStatus(tx, existing.rentalPeriodId);
    	
		});

    	const payment = await prisma.payment.findUnique({ where: { id }, select: paymentSelect() });
    
		sendSuccess(res, { payment }, 'Payment confirmed');
  
	} catch (err) {
    	next(err);
  	}
}

// PUT /api/payments/:id/proof-image  (student)
export async function uploadProofImage(req: Request, res: Response, next: NextFunction): Promise<void> {
  	try {
		if (!req.user) throw new UnauthorizedError();
		if (!req.file) throw new BadRequestError('No image file provided');
    
		const proofImageUrl = await uploadPaymentProofImage(req.file.buffer, req.file.mimetype);

    	sendSuccess(res, { proofImageUrl }, 'Proof image uploaded successfully');
  	
	} catch (err) {
    	next(err);
  	}
}

// PATCH /api/v1/payments/:id/reject  (owner)
export async function rejectPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  	
	try {
    	
		const { id } = req.params as { id: string };
    	const ownerId = req.user!.userId;
    	const { reason } = req.body as RejectPaymentInput;

    	const existing = await prisma.payment.findUnique({
      		where: { id },
      		include: { 
				reservation: { 
					include: { 
						boarding: true 
					} 
				} 
			},
    	});

    	if (!existing) throw new NotFoundError('Payment not found');
    
		if (existing.reservation.boarding.ownerId !== ownerId) {
      		throw new ForbiddenError('You do not own this boarding');
    	}
    
		if (existing.status !== PaymentStatus.PENDING) {
      		throw new BadRequestError('Only PENDING payments can be rejected');
    	}

    	const payment = await prisma.payment.update({
      		where: { id },
      		data: { 
				status: PaymentStatus.REJECTED, 
				rejectionReason: reason 
			},

      		select: paymentSelect(),
		
    	});

    	sendSuccess(res, { payment }, 'Payment rejected');
  
	} catch (err) {
    	next(err);
  	}
}
