import type { Request, Response, NextFunction } from "express";
import { Prisma, BoardingStatus } from "@prisma/client";
import prisma from "@/lib/prisma.js";
import { generateUniqueSlug } from "@/utils/slug.js"
import { MAX_BOARDING_IMAGES } from "@/middleware/upload.js"
import { uploadBoardingImage, deleteBoardingImage } from '@/lib/cloudinary.js';
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
import { boardingTypeSchema } from "@/schemas/index.js";

// Helpers
export function boardingSelect() {

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

        amenities: {
            select: { id: true, name: true, createdAt: true },
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
            amenities,
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

            ...(amenities && amenities.length > 0 && {
                amenities: {
                    some: {
                        name: { in: amenities },
                    },
                },
            }),
            
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

        const { rules, amenities, ...boardingData } = body;

        const boarding = await prisma.boarding.create({

            data: {
                ...boardingData,
                ownerId,
                slug,
                amenities: amenities && amenities.length > 0
                    ? { create: amenities.map((name) => ({ name })) }
                    : undefined,
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

    const { rules, title, amenities, ...rest } = body;

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

            if (amenities !== undefined) {
                await tx.boardingAmenity.deleteMany({
                    where: { boardingId: id },
                });
            }

            return tx.boarding.update({
                where: { id },
                data: {
                    ...rest,
                    ...(title && { title }),
                    slug,
                    ...(amenities !== undefined && {
                        amenities: { create: amenities.map((name) => ({ name })) },
                    }),
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

// PATCH /api/boardings/:id/submit  (owner)
export async function submitBoarding(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {

        const { id } = req.params as { id: string };
        const ownerId = req.user!.userId;

        const existing = await prisma.boarding.findUnique({
            where: { id },
            include: { images: true },
        });

        if (!existing) throw new BoardingNotFoundError();

        if (existing.ownerId !== ownerId) throw new ForbiddenError("You do not own this Listing");

        if (existing.status !== BoardingStatus.DRAFT && existing.status !== BoardingStatus.REJECTED) {
            throw new InvalidStateTransitionError('Only DRAFT or REJECTED listings can be submitted for approval')
        }

        if (existing.images.length === 0) {
            throw new ValidationError("At least 1 image is required to submit for approval");
        }

        const boarding = await prisma.boarding.update({
            where: { id },
            data: {
                status: BoardingStatus.PENDING_APPROVAL, 
                rejectionReason: null
            },
            select: boardingSelect(),
        });

        sendSuccess(res, { boarding }, "Boarding Submitted for Approval");

    } catch(error) {
        next(error);
    }
}

// PATCH /api/v1/boardings/:id/deactivate  (owner)
export async function deactivateBoarding(req: Request, res: Response, next: NextFunction): Promise<void> {

    try {
        const { id } = req.params as { id: string };
        const ownerId = req.user!.userId;

    const existing = await prisma.boarding.findUnique({ where: { id } });

    if (!existing || existing.isDeleted) throw new BoardingNotFoundError();
    
    if (existing.ownerId !== ownerId) throw new ForbiddenError('You do not own this listing');

    if (existing.status !== BoardingStatus.ACTIVE) {
        throw new InvalidStateTransitionError('Only ACTIVE listings can be deactivated');
    }

    const boarding = await prisma.boarding.update({
        where: { id },
        data: { status: BoardingStatus.INACTIVE },
        select: boardingSelect(),
    });

    sendSuccess(res, { boarding }, 'Boarding deactivated successfully');
    
    } catch (err) {
        next(err);
    }
}

// PATCH /api/boardings/:id/activate  (owner)
export async function activateBoarding(req: Request, res: Response, next: NextFunction): Promise<void> {
    
    try {
        const { id } = req.params as { id: string };
        const ownerId = req.user!.userId;

        const existing = await prisma.boarding.findUnique({ where: { id } });
        
        if (!existing || existing.isDeleted) throw new BoardingNotFoundError();
    
        if (existing.ownerId !== ownerId) throw new ForbiddenError('You do not own this listing');

    
        if (existing.status !== BoardingStatus.INACTIVE) {
            throw new InvalidStateTransitionError('Only INACTIVE listings can be activated');
        }

        const boarding = await prisma.boarding.update({
            where: { id },
            data: { status: BoardingStatus.ACTIVE },
            select: boardingSelect(),
        });

        sendSuccess(res, { boarding }, 'Boarding activated successfully');

    } catch (err) {
        next(err);
    }
}

// POST /api/boardings/:id/images  (owner)
export async function uploadImages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {

        const { id } = req.params as { id: string };
        const ownerId = req.user!.userId;

        const existing = await prisma.boarding.findUnique({
            where: { id },
            include: { images: true } 
        });

        if (!existing || existing.isDeleted) throw new BoardingNotFoundError();

        if (existing.ownerId !== ownerId) throw new ForbiddenError('You do not own this listing');

        const files = req.files as Express.Multer.File[] | undefined;

        if (!files || files.length === 0) {
            throw new ValidationError('No images provided');
        }

        const currentCount = existing.images.length;
        
        if (currentCount + files.length > MAX_BOARDING_IMAGES) {
                throw new ValidationError(
                    `Cannot exceed ${MAX_BOARDING_IMAGES} images. Currently have ${currentCount}, trying to add ${files.length}.`
                );
        }

        const uploadedImages = await Promise.all(
            files.map((file) => uploadBoardingImage(file.buffer, file.mimetype)),
        );

        const images = await prisma.$transaction(
            uploadedImages.map((img) => 
                prisma.boardingImage.create ({
                    data: {
                        boardingId: id,
                        url: img.url,
                        publicId: img.publicId ,
                    },

                    select: { 
                        id: true, 
                        url: true, 
                        publicId: 
                        true, 
                        createdAt: true 
                    }

                }),
            ),
        );

        sendSuccess(res, { images }, "Images Uploaded Sucessfully", 201);

    } catch(error) {
        next(error);
    }
}

// DELETE /api/boardings/:id/images/:imageId  (owner)
export async function deleteImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {

        const { id, imageId } = req.params as { id: string; imageId: string };
        const ownerId = req.user!.userId;

        const existing = await prisma.boarding.findUnique({ 
            where: { id } 
        });
        
        if (!existing || existing.isDeleted) throw new BoardingNotFoundError();
        
        if (existing.ownerId !== ownerId) throw new ForbiddenError('You do not own this listing');

        const image = await prisma.boardingImage.findUnique({ 
            where: { id: imageId } 
        });
    
        if (!image || image.boardingId !== id) {
            throw new BoardingNotFoundError('Image not found');
        }

        await deleteBoardingImage(image.publicId);
        
        await prisma.boardingImage.delete({ 
            where: { id: imageId } 
        });

        sendSuccess(res, null, 'Image deleted successfully');
    
    } catch (err) {
        next(err);
    }
}