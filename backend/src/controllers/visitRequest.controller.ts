import type { Request, Response, NextFunction } from 'express';
import prisma from '@/lib/prisma.js';
import { sendSuccess } from '@/lib/response.js';;
import {
  	BoardingNotFoundError,
  	ForbiddenError,
  	ConflictError,
  	BadRequestError,
  	NotFoundError,
  	GoneError,
} from '@/errors/AppError.js';

import type { 
  	CreateVisitRequestInput, 
  	RejectVisitRequestInput 
} from '@/schemas/visitRequest.validators.js';

import { 
	BoardingStatus, 
	VisitRequestStatus 
} from '@prisma/client';

const VISIT_EXPIRY_HOURS = 72;

function visitRequestSelect() {
  	return {
    	id: true,
    	studentId: true,
    	boardingId: true,
    	status: true,
    	requestedStartAt: true,
    	requestedEndAt: true,
    	message: true,
    	rejectionReason: true,
    	expiresAt: true,
    	createdAt: true,
    	updatedAt: true,
    	student: { 	
			select: { 
				id: true, 
				firstName: true, 
				lastName: true, 
				email: true } 
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

// POST /api/v1/visit-requests  (student)
export async function createVisitRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  	try {
    	const studentId = req.user!.userId;
    	const body = req.body as CreateVisitRequestInput;

    	const now = new Date();
    	const requestedStartAt = new Date(body.requestedStartAt);
    	const requestedEndAt = new Date(body.requestedEndAt);

    	if (requestedStartAt <= now) {
     		throw new BadRequestError('requestedStartAt must be in the future');
    	}

    	if (requestedEndAt <= requestedStartAt) {
      		throw new BadRequestError('requestedEndAt must be after requestedStartAt');
    	}

    	const boarding = await prisma.boarding.findUnique({ where: { id: body.boardingId } });
    	
		if (!boarding || boarding.isDeleted) throw new BoardingNotFoundError();
    	
		if (boarding.status !== BoardingStatus.ACTIVE) {
      		throw new BadRequestError('Boarding is not available for visit requests');
    	}

    	// One pending request per boarding per student
    	const existing = await prisma.visitRequest.findFirst({
      		where: {
        		studentId,
        		boardingId: body.boardingId,
        		status: VisitRequestStatus.PENDING,
      		},
    	});

    	if (existing) {
      		throw new ConflictError('You already have a pending visit request for this boarding');
    	}

    	const expiresAt = new Date();
    	
		expiresAt.setHours(expiresAt.getHours() + VISIT_EXPIRY_HOURS);

    	const visitRequest = await prisma.visitRequest.create({
      		data: {
        		studentId,
        		boardingId: body.boardingId,
        		requestedStartAt,
        		requestedEndAt,
        		message: body.message,
        		expiresAt,
      		},

      		select: visitRequestSelect(),

    	});

    	sendSuccess(res, { visitRequest }, 'Visit request created successfully', 201);
  	
	} catch (err) {
    	next(err);
  	}
}

