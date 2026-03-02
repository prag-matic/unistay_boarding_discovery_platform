import type { Request, Response, NextFunction } from "express";
import { Prisma, BoardingStatus } from "@prisma/client";
import prisma from "@/lib/prisma.js";
import { generateUniqueSlug } from "@/utils/slug.js"
import { sendSuccess } from "@/lib/response.js";

import type { 
    SearchBoardingsQuery, 
    CreateBoardingInput, 
    UpdateBoardingInput,
} from "@/schemas/boarding.validators.js"

import { 
    BoardingNotFoundError, 
    ValidationError, 
    ForbiddenError,
    InvalidStateTransitionError,
} from "@/errors/AppError.js";

// Helpers
function boardingSelect() {

    return {
        id: true,
        ownerId: true,
        title: true,
        slug: true,
        description: true,
        city: true,
        district: true,
        address: true,
        monthlyRent: true,
        boardingType: true,
        genderPref: true,
        isFurnished: true,
        hasWifi: true,
        nearUniversity: true,
        latitude: true,
        longitude: true,
        maxOccupants: true,
        currentOccupants: true,
        status: true,
        rejectionReason: true,
        isDeleted: true,
        createdAt: true,
        updatedAt: true,

        images: {
            select: { id: true, url: true, publicId: true, createdAt: true },
        },

        rules: {
            select: { id: true, rule: true },
        },

        owner: {
            select: { id: true, firstName: true, lastName: true, phone: true },
        },

    } as const;
}

// GET /api/boardings  (public)
export async function searchBoardings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const {
            page,
            size,
            city,
            district,
            minRent,
            maxRent,
            boardingType,
            genderPref,
            isFurnished,
            hasWifi,
            nearUniversity,
            search,
            sortBy,
            sortDir,
        } = req.query as unknown as SearchBoardingsQuery;

        const where: Prisma.BoardingWhereInput = {
            status: BoardingStatus.ACTIVE,
            isDeleted: false,
            ...(city && { city: { equals: city, mode: 'insensitive' } }),
            ...(district && { district: { equals: district, mode: 'insensitive' } }),
            
            ...(minRent !== undefined || maxRent !== undefined
                ? { monthlyRent: { 
                    ...(minRent !== undefined && { gte: minRent }), 
                    ...(maxRent !== undefined && { lte: maxRent }) } }
                : {}
            ),

            ...(boardingType && { boardingType }),
            ...(genderPref && { genderPref }),
            ...(isFurnished !== undefined && { isFurnished }),
            ...(hasWifi !== undefined && { hasWifi }),
            ...(nearUniversity && { nearUniversity: { contains: nearUniversity, mode: 'insensitive' } }),

            ...(search && {
                OR: [
                    { title: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                ],
            }),
        };

        const orderBy: Prisma.BoardingOrderByWithRelationInput = {
            [sortBy]: sortDir,
        };

        const [boarding, total] = await prisma.$transaction([

            prisma.boarding.findMany({
                where,
                skip: (page - 1) * size,
                take: size,
                orderBy,
                select: boardingSelect()
            }),

            prisma.boarding.count({ where }),

        ]);

        sendSuccess(res, {
            boarding, 
            pagination: { total, page, size, totalPages: Math.ceil(total / size)},
        });

    } catch(error) {
        next(error);
    }
}

// GET /api/boardings/:slug  (public)
export async function getBoardingBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {

        const { slug } = req.params as { slug: string };

        const boarding = await prisma.boarding.findUnique({
            where: { slug },
            select: boardingSelect(),
        });

        if (!boarding || boarding.isDeleted || boarding.status !== BoardingStatus.ACTIVE) {
            throw new BoardingNotFoundError();
        }

        sendSuccess(res, { boarding })

    } catch(error) {
        next(error);
    }
}

// GET /api/v1/boardings/my-listings  (owner)
export async function getMyListings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {

        const ownerId = req.user!.userId;

        const boardings = await prisma.boarding.findMany({
            where: { ownerId, isDeleted: false },
            orderBy: { createdAt: 'desc' },
            select: boardingSelect(),
        });

        sendSuccess(res, { boardings });

  } catch (err) {
    next(err);
  }
}

// POST /api/boardings  (owner)
export async function createBoarding(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const ownerId = req.user!.userId;
        const body = req.body as CreateBoardingInput;

        if (body.currentOccupants > body.maxOccupants) {
            throw new ValidationError('currentOccupants cannot Exceed Max Occupants');
        }

        const slug = await generateUniqueSlug(body.title);

        const { rules, ...boardingData } = body;

        const boarding = await prisma.boarding.create({

            data: {
                ...boardingData,
                ownerId,
                slug,
                rules: rules && rules.length > 0
                    ? { create: rules.map((rule) => ({ rule }))}
                    : undefined,
            },

            select: boardingSelect(),

        });

        sendSuccess(res, { boarding }, "Boarding Created Successfully", 201);

    } catch (error) {
        next(error);
    }
}

// PUT /api/v1/boardings/:id  (owner)
export async function updateBoarding(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        
        const { id } = req.params as { id: string };
        const ownerId = req.user!.userId;
        const body = req.body as UpdateBoardingInput;

        const existing = await prisma.boarding.findUnique({
            where: { id } 
        });
        
        if (!existing || existing.isDeleted) throw new BoardingNotFoundError();
        
        if (existing.ownerId !== ownerId) throw new ForbiddenError('You do not own this listing');

        if (existing.status === BoardingStatus.ACTIVE || existing.status === BoardingStatus.PENDING_APPROVAL) {
            throw new InvalidStateTransitionError(
                'Cannot edit an active or pending listing. Deactivate first.',
            );
        }

        const maxOccupants = body.maxOccupants ?? existing.maxOccupants;

        const currentOccupants = body.currentOccupants ?? existing.currentOccupants;

        if (currentOccupants > maxOccupants) {
            throw new ValidationError('currentOccupants cannot exceed maxOccupants');
        }

        const { rules, title, ...rest } = body;

        let slug = existing.slug;

        if (title && title !== existing.title) {
            slug = await generateUniqueSlug(title, id);
        }

        const boarding = await prisma.$transaction(async (tx) => {
      
            if (rules !== undefined) {
                await tx.boardingRule.deleteMany({ 
                    where: { boardingId: id } 
                });
            }

            return tx.boarding.update({
                where: { id },
                data: {
                    ...rest,
                    ...(title && { title }),
                    slug,
                    ...(rules !== undefined && {
                        rules: { create: rules.map((rule) => ({ rule })) },
                    }),
                },

                select: boardingSelect(),
        
            });
        });

        sendSuccess(res, { boarding }, 'Boarding updated successfully');

    } catch (err) {
        next(err);
    }
}