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

// GET /api/v1/visit-requests/my-requests  (student)
export async function getMyVisitRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
  	try {
    	const studentId = req.user!.userId;

    	const visitRequests = await prisma.visitRequest.findMany({
      		where: { studentId },
      		orderBy: { createdAt: 'desc' },
      		select: visitRequestSelect(),
    	});

    	sendSuccess(res, { visitRequests });
  	
	} catch (err) {
    	next(err);
  	}
}

// GET /api/v1/visit-requests/my-boardings  (owner)
export async function getMyBoardingVisitRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
  	try {
    	const ownerId = req.user!.userId;

    	const visitRequests = await prisma.visitRequest.findMany({
      		where: { boarding: { ownerId } },
      		orderBy: { createdAt: 'desc' },
      		select: visitRequestSelect(),
   		});

    sendSuccess(res, { visitRequests });
  	
	} catch (err) {
    	next(err);
  	}
}

// GET /api/v1/visit-requests/:id
export async function getVisitRequestById(req: Request, res: Response, next: NextFunction): Promise<void> {
  	try {
    	const { id } = req.params as { id: string };
    	const userId = req.user!.userId;
    	const role = req.user!.role;

    	const visitRequest = await prisma.visitRequest.findUnique({
      		where: { id },
      		select: visitRequestSelect(),
    	});

    	if (!visitRequest) throw new NotFoundError('Visit request not found');

    	if (role !== 'ADMIN') {
      		const isStudent = visitRequest.studentId === userId;
      
		if (!isStudent) {
        	const boarding = await prisma.boarding.findUnique({ where: { id: visitRequest.boardingId } });
        	
			if (!boarding || boarding.ownerId !== userId) {
          		throw new ForbiddenError('Access denied');
        	}
      	}
    }

    sendSuccess(res, { visitRequest });
  	
	} catch (err) {
    	next(err);
 	}
}

// PATCH /api/v1/visit-requests/:id/approve  (owner)
export async function approveVisitRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  	try {
    	const { id } = req.params as { id: string };
    	const ownerId = req.user!.userId;

    	const existing = await prisma.visitRequest.findUnique({
      		where: { id },
      		include: { boarding: true },
    	});

    	if (!existing) throw new NotFoundError('Visit request not found');
    	
		if (existing.boarding.ownerId !== ownerId) {
      		throw new ForbiddenError('You do not own this boarding');
    	}

    	if (existing.status !== VisitRequestStatus.PENDING) {
      		throw new BadRequestError('Only PENDING visit requests can be approved');
    	}

    	// Check date and find if expired
    	if (new Date() > existing.expiresAt) {
      		await prisma.visitRequest.update({ 
				where: { id }, 
				data: { status: VisitRequestStatus.EXPIRED } });
      	
			throw new GoneError('Visit request has expired');
    	}

    	const visitRequest = await prisma.visitRequest.update({
      		where: { id },
      		data: { status: VisitRequestStatus.APPROVED },
      		select: visitRequestSelect(),
    	});

    	sendSuccess(res, { visitRequest }, 'Visit request approved');
  	
	} catch (err) {
    	next(err);
  	}
}

// PATCH /api/v1/visit-requests/:id/reject  (owner)
export async function rejectVisitRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  	try {
    	const { id } = req.params as { id: string };
    	const ownerId = req.user!.userId;
    	const { reason } = req.body as RejectVisitRequestInput;

    	const existing = await prisma.visitRequest.findUnique({
      		where: { id },
      		include: { boarding: true },
    	});
    
		if (!existing) throw new NotFoundError('Visit request not found');
    
		if (existing.boarding.ownerId !== ownerId) {
      		throw new ForbiddenError('You do not own this boarding');
    	}
    
		if (existing.status !== VisitRequestStatus.PENDING) {
      		throw new BadRequestError('Only PENDING visit requests can be rejected');
    	}

    	const visitRequest = await prisma.visitRequest.update({
      		where: { id },
      		data: { 
				status: VisitRequestStatus.REJECTED, 
				rejectionReason: reason },
      		select: visitRequestSelect(),
    	});

    
		sendSuccess(res, { visitRequest }, 'Visit request rejected');
  
	} catch (err) {
    	next(err);
  	}
}

// PATCH /api/v1/visit-requests/:id/cancel  (student)
export async function cancelVisitRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  	try {
    	const { id } = req.params as { id: string };
    	const studentId = req.user!.userId;

    	const existing = await prisma.visitRequest.findUnique({ where: { id } });
    
		if (!existing) throw new NotFoundError('Visit request not found');
    	
		if (existing.studentId !== studentId) throw new ForbiddenError('This is not your visit request');
    	
		if (
      		existing.status !== VisitRequestStatus.PENDING &&
      		existing.status !== VisitRequestStatus.APPROVED
    	) {
      		throw new BadRequestError('Only PENDING or APPROVED visit requests can be cancelled');
   		}

    	const visitRequest = await prisma.visitRequest.update({
      		where: { id },
      		data: { status: VisitRequestStatus.CANCELLED },
      		select: visitRequestSelect(),
    	});

    	sendSuccess(res, { visitRequest }, 'Visit request cancelled');
  	
	} catch (err) {
    	next(err);
  	}
}
