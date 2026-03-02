import type { Request, Response, NextFunction } from "express";
import { Prisma, BoardingStatus } from "@prisma/client";
import prisma from "@/lib/prisma.js";
import { sendSuccess } from "@/lib/response.js";

import type { SearchBoardingsQuery } from "@/schemas/boarding.validators.js"
import { BoardingNotFoundError } from "@/errors/AppError.js";

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

// GET /api/v1/boardings  (public)
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

// GET /api/v1/boardings/:slug  (public)
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
