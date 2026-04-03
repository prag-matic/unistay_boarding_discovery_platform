import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import {
	BoardingNotFoundError,
	ForbiddenError,
	InvalidStateTransitionError,
	ValidationError,
} from "@/errors/AppError.js";
import { deleteBoardingImage, uploadBoardingImage } from "@/lib/cloudinary.js";
import { sendSuccess } from "@/lib/response.js";
import { MAX_BOARDING_IMAGES } from "@/middleware/upload.js";
import {
	Boarding,
	BoardingAmenity,
	BoardingImage,
	BoardingRule,
} from "@/models/index.js";
import type {
	CreateBoardingInput,
	SearchBoardingsQuery,
	UpdateBoardingInput,
} from "@/schemas/boarding.validators.js";
import { BoardingStatus } from "@/types/enums.js";
import { generateUniqueSlug } from "@/utils/slug.js";

// GET /api/boardings  (public)
export async function searchBoardings(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
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

		const query: Record<string, unknown> = {
			status: BoardingStatus.ACTIVE,
			isDeleted: false,
		};

		if (city) {
			query.city = new RegExp(`^${city}$`, "i");
		}

		if (district) {
			query.district = new RegExp(`^${district}$`, "i");
		}

		if (minRent !== undefined || maxRent !== undefined) {
			query.monthlyRent = {} as Record<string, number>;
			if (minRent !== undefined)
				(query.monthlyRent as Record<string, number>).$gte = minRent;
			if (maxRent !== undefined)
				(query.monthlyRent as Record<string, number>).$lte = maxRent;
		}

		if (boardingType) {
			query.boardingType = boardingType;
		}

		if (genderPref) {
			query.genderPref = genderPref;
		}

		if (amenities && amenities.length > 0) {
			const amenityIds = await BoardingAmenity.find({
				name: { $in: amenities },
			}).distinct("boardingId");
			query._id = { $in: amenityIds };
		}

		if (nearUniversity) {
			query.nearUniversity = new RegExp(nearUniversity, "i");
		}

		if (search) {
			query.$or = [
				{ title: new RegExp(search, "i") },
				{ description: new RegExp(search, "i") },
			];
		}

		const sortField = sortBy || "createdAt";
		const sortOrder = sortDir === "asc" ? 1 : -1;

		const [boarding, total] = await Promise.all([
			Boarding.find(query)
				.populate("ownerId", "firstName lastName phone")
				.populate({
					path: "images",
					select: "id url publicId createdAt",
				})
				.populate({
					path: "amenities",
					select: "id name createdAt",
				})
				.populate({
					path: "rules",
					select: "id rule",
				})
				.sort({ [sortField]: sortOrder })
				.skip((page - 1) * size)
				.limit(size)
				.lean({ virtuals: true }),

			Boarding.countDocuments(query),
		]);

		sendSuccess(res, {
			boarding,
			pagination: { total, page, size, totalPages: Math.ceil(total / size) },
		});
	} catch (error) {
		next(error);
	}
}

// GET /api/boardings/:slug  (public)
export async function getBoardingBySlug(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { slug } = req.params as { slug: string };

		const boarding = await Boarding.findOne({ slug })
			.populate("ownerId", "firstName lastName phone")
			.populate({
				path: "images",
				select: "id url publicId createdAt",
			})
			.populate({
				path: "amenities",
				select: "id name createdAt",
			})
			.populate({
				path: "rules",
				select: "id rule",
			})
			.lean({ virtuals: true });

		if (
			!boarding ||
			boarding.isDeleted ||
			boarding.status !== BoardingStatus.ACTIVE
		) {
			throw new BoardingNotFoundError();
		}

		sendSuccess(res, { boarding });
	} catch (error) {
		next(error);
	}
}

// GET /api/v1/boardings/my-listings  (owner)
export async function getMyListings(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user?.userId) {
			throw new ForbiddenError("User is not authenticated");
		}
		const ownerId = req.user.userId;

		const boardings = await Boarding.find({ ownerId, isDeleted: false })
			.populate("ownerId", "firstName lastName phone")
			.populate({
				path: "images",
				select: "id url publicId createdAt",
			})
			.populate({
				path: "amenities",
				select: "id name createdAt",
			})
			.populate({
				path: "rules",
				select: "id rule",
			})
			.sort({ createdAt: -1 })
			.lean({ virtuals: true });

		sendSuccess(res, { boardings });
	} catch (err) {
		next(err);
	}
}

// POST /api/boardings  (owner)
export async function createBoarding(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user?.userId) {
			throw new ForbiddenError("User is not authenticated");
		}
		const ownerId = req.user.userId;
		const body = req.body as CreateBoardingInput;

		if (body.currentOccupants > body.maxOccupants) {
			throw new ValidationError("currentOccupants cannot Exceed Max Occupants");
		}

		const slug = await generateUniqueSlug(body.title);

		const { rules, amenities, ...boardingData } = body;

		const boarding = await Boarding.create({
			...boardingData,
			ownerId,
			slug,
		});

		// Create amenities if provided
		if (amenities && amenities.length > 0) {
			await BoardingAmenity.insertMany(
				amenities.map((name) => ({ boardingId: boarding._id, name })),
			);
		}

		// Create rules if provided
		if (rules && rules.length > 0) {
			await BoardingRule.insertMany(
				rules.map((rule) => ({ boardingId: boarding._id, rule })),
			);
		}

		// Fetch complete boarding with populated fields
		const completeBoarding = await Boarding.findById(boarding._id)
			.populate("ownerId", "firstName lastName phone")
			.populate({
				path: "images",
				select: "id url publicId createdAt",
			})
			.populate({
				path: "amenities",
				select: "id name createdAt",
			})
			.populate({
				path: "rules",
				select: "id rule",
			})
			.lean({ virtuals: true });

		sendSuccess(
			res,
			{ boarding: completeBoarding },
			"Boarding Created Successfully",
			201,
		);
	} catch (error) {
		next(error);
	}
}

// PUT /api/v1/boardings/:id  (owner)
export async function updateBoarding(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user?.userId) {
			throw new ForbiddenError("User is not authenticated");
		}
		const { id } = req.params as { id: string };
		const ownerId = req.user.userId;
		const body = req.body as UpdateBoardingInput;

		const existing = await Boarding.findById(id);

		if (!existing || existing.isDeleted) throw new BoardingNotFoundError();

		if (existing.ownerId.toString() !== ownerId)
			throw new ForbiddenError("You do not own this listing");

        const shouldSetPendingApprovalAfterEdit = existing.status === BoardingStatus.ACTIVE;
		
		if (
			existing.status === BoardingStatus.ACTIVE ||
			existing.status === BoardingStatus.PENDING_APPROVAL
		) {
			throw new InvalidStateTransitionError(
				"Cannot edit an active or pending listing. Deactivate first.",
			);
		}

		const maxOccupants = body.maxOccupants ?? existing.maxOccupants;
		const currentOccupants = body.currentOccupants ?? existing.currentOccupants;

		if (currentOccupants > maxOccupants) {
			throw new ValidationError("currentOccupants cannot exceed maxOccupants");
		}

		const { rules, title, amenities, ...rest } = body;

		let slug = existing.slug;

		if (title && title !== existing.title) {
			slug = await generateUniqueSlug(title, id);
		}

		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			// Delete existing rules if rules array is provided
			if (rules !== undefined) {
				await BoardingRule.deleteMany({ boardingId: id }).session(session);
			}

			// Delete existing amenities if amenities array is provided
			if (amenities !== undefined) {
				await BoardingAmenity.deleteMany({ boardingId: id }).session(session);
			}

			// Update boarding
			const _boarding = await Boarding.findByIdAndUpdate(
				id,
				{
					...rest,
					...(title && { title }),
					slug,
				},
				{ new: true, session },
			)
				.populate("ownerId", "firstName lastName phone")
				.populate({
					path: "images",
					select: "id url publicId createdAt",
				})
				.populate({
					path: "amenities",
					select: "id name createdAt",
				})
				.populate({
					path: "rules",
					select: "id rule",
				})
				.lean({ virtuals: true });

			// Create new rules if provided
			if (rules && rules.length > 0) {
				await BoardingRule.insertMany(
					rules.map((rule) => ({ boardingId: id, rule })),
					{ session },
				);
			}

			// Create new amenities if provided
			if (amenities && amenities.length > 0) {
				await BoardingAmenity.insertMany(
					amenities.map((name) => ({ boardingId: id, name })),
					{ session },
				);
			}

			await session.commitTransaction();

			// Re-fetch to get updated populated data
			const updatedBoarding = await Boarding.findById(id)
				.populate("ownerId", "firstName lastName phone")
				.populate({
					path: "images",
					select: "id url publicId createdAt",
				})
				.populate({
					path: "amenities",
					select: "id name createdAt",
				})
				.populate({
					path: "rules",
					select: "id rule",
				})
				.lean({ virtuals: true });

			sendSuccess(
				res,
				{ boarding: updatedBoarding },
				"Boarding updated successfully",
			);
		} catch (error) {
			await session.abortTransaction();
			throw error;
		} finally {
			session.endSession();
		}
	} catch (err) {
		next(err);
	}
}

// PATCH /api/boardings/:id/submit  (owner)
export async function submitBoarding(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user?.userId) {
			throw new ForbiddenError("User is not authenticated");
		}
		const { id } = req.params as { id: string };
		const ownerId = req.user.userId;

		const existing = await Boarding.findById(id).populate({
			path: "images",
			select: "id url publicId",
		});

		if (!existing) throw new BoardingNotFoundError();

		if (existing.ownerId.toString() !== ownerId)
			throw new ForbiddenError("You do not own this Listing");

		if (
			existing.status !== BoardingStatus.DRAFT &&
			existing.status !== BoardingStatus.REJECTED
		) {
			throw new InvalidStateTransitionError(
				"Only DRAFT or REJECTED listings can be submitted for approval",
			);
		}

        if (
            existing.status !== BoardingStatus.DRAFT &&
            existing.status !== BoardingStatus.REJECTED &&
            existing.status !== BoardingStatus.INACTIVE
        ) {
            throw new InvalidStateTransitionError('Only DRAFT, REJECTED, or INACTIVE listings can be submitted for approval')
        }
		
		if (
			(existing as typeof existing & { images?: unknown[] }).images?.length ===
			0
		) {
			throw new ValidationError(
				"At least 1 image is required to submit for approval",
			);
		}

		const boarding = await Boarding.findByIdAndUpdate(
			id,
			{
				status: BoardingStatus.PENDING_APPROVAL,
				rejectionReason: null,
			},
			{ new: true },
		)
			.populate("ownerId", "firstName lastName phone")
			.populate({
				path: "images",
				select: "id url publicId createdAt",
			})
			.populate({
				path: "amenities",
				select: "id name createdAt",
			})
			.populate({
				path: "rules",
				select: "id rule",
			})
			.lean({ virtuals: true });

		sendSuccess(res, { boarding }, "Boarding Submitted for Approval");
	} catch (error) {
		next(error);
	}
}

// PATCH /api/v1/boardings/:id/deactivate  (owner)
export async function deactivateBoarding(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user?.userId) {
			throw new ForbiddenError("User is not authenticated");
		}
		const { id } = req.params as { id: string };
		const ownerId = req.user.userId;

		const existing = await Boarding.findById(id);

		if (!existing || existing.isDeleted) throw new BoardingNotFoundError();

		if (existing.ownerId.toString() !== ownerId)
			throw new ForbiddenError("You do not own this listing");

		if (existing.status !== BoardingStatus.ACTIVE) {
			throw new InvalidStateTransitionError(
				"Only ACTIVE listings can be deactivated",
			);
		}

		const boarding = await Boarding.findByIdAndUpdate(
			id,
			{ status: BoardingStatus.INACTIVE },
			{ new: true },
		)
			.populate("ownerId", "firstName lastName phone")
			.populate({
				path: "images",
				select: "id url publicId createdAt",
			})
			.populate({
				path: "amenities",
				select: "id name createdAt",
			})
			.populate({
				path: "rules",
				select: "id rule",
			})
			.lean({ virtuals: true });

		sendSuccess(res, { boarding }, "Boarding deactivated successfully");
	} catch (err) {
		next(err);
	}
}

// PATCH /api/boardings/:id/activate  (owner)
export async function activateBoarding(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user?.userId) {
			throw new ForbiddenError("User is not authenticated");
		}
		const { id } = req.params as { id: string };
		const ownerId = req.user.userId;

		const existing = await Boarding.findById(id);

		if (!existing || existing.isDeleted) throw new BoardingNotFoundError();

		if (existing.ownerId.toString() !== ownerId)
			throw new ForbiddenError("You do not own this listing");

		if (existing.status !== BoardingStatus.INACTIVE) {
			throw new InvalidStateTransitionError(
				"Only INACTIVE listings can be activated",
			);
		}

		const boarding = await Boarding.findByIdAndUpdate(
			id,
			{ status: BoardingStatus.ACTIVE },
			{ new: true },
		)
			.populate("ownerId", "firstName lastName phone")
			.populate({
				path: "images",
				select: "id url publicId createdAt",
			})
			.populate({
				path: "amenities",
				select: "id name createdAt",
			})
			.populate({
				path: "rules",
				select: "id rule",
			})
			.lean({ virtuals: true });

		sendSuccess(res, { boarding }, "Boarding activated successfully");
	} catch (err) {
		next(err);
	}
}

// POST /api/boardings/:id/images  (owner)
export async function uploadImages(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user?.userId) {
			throw new ForbiddenError("User is not authenticated");
		}
		const { id } = req.params as { id: string };
		const ownerId = req.user.userId;

		const existing = await Boarding.findById(id).populate({
			path: "images",
			select: "id url publicId",
		});

		if (!existing || existing.isDeleted) throw new BoardingNotFoundError();

		if (existing.ownerId.toString() !== ownerId)
			throw new ForbiddenError("You do not own this listing");

		const files = req.files as Express.Multer.File[] | undefined;

		if (!files || files.length === 0) {
			throw new ValidationError("No images provided");
		}

		const currentCount =
			(existing as typeof existing & { images?: unknown[] }).images?.length ||
			0;

		if (currentCount + files.length > MAX_BOARDING_IMAGES) {
			throw new ValidationError(
				`Cannot exceed ${MAX_BOARDING_IMAGES} images. Currently have ${currentCount}, trying to add ${files.length}.`,
			);
		}

		const uploadedImages = await Promise.all(
			files.map((file) => uploadBoardingImage(file.buffer, file.mimetype)),
		);

		const images = await BoardingImage.insertMany(
			uploadedImages.map((img) => ({
				boardingId: id,
				url: img.url,
				publicId: img.publicId,
			})),
		);

		sendSuccess(res, { images }, "Images Uploaded Successfully", 201);
	} catch (error) {
		next(error);
	}
}

// DELETE /api/boardings/:id/images/:imageId  (owner)
export async function deleteImage(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user?.userId) {
			throw new ForbiddenError("User is not authenticated");
		}
		const { id, imageId } = req.params as { id: string; imageId: string };
		const ownerId = req.user.userId;

		const existing = await Boarding.findById(id);

		if (!existing || existing.isDeleted) throw new BoardingNotFoundError();

		if (existing.ownerId.toString() !== ownerId)
			throw new ForbiddenError("You do not own this listing");

		const image = await BoardingImage.findById(imageId);

		if (!image || image.boardingId.toString() !== id) {
			throw new BoardingNotFoundError("Image not found");
		}

		await deleteBoardingImage(image.publicId);

		await BoardingImage.findByIdAndDelete(imageId);

		sendSuccess(res, null, "Image deleted successfully");
	} catch (err) {
		next(err);
	}
}
