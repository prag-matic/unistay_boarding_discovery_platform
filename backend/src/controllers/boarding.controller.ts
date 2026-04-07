import type { NextFunction, Request, Response } from "express";
import {
	BoardingNotFoundError,
	ForbiddenError,
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
import { BoardingStatus, Role } from "@/types/enums.js";
import { addId, transformBoardingDoc } from "@/utils/index.js";
import { generateUniqueSlug } from "@/utils/slug.js";
import { boardingWorkflowService } from "@/services/boardingWorkflow.service.js";
import {
	BOARDING_LIFECYCLE_POLICY,
	BOARDING_TRANSITIONS,
	BOARDING_VISIBILITY,
	LIFECYCLE_SPEC_VERSION,
} from "@/domain/boardingLifecycle.js";

async function getPopulatedBoardingById(id: string) {
	return Boarding.findById(id)
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
}

// GET /api/boardings/lifecycle/spec
export async function getBoardingLifecycleSpec(
	_req: Request,
	res: Response,
): Promise<void> {
	sendSuccess(res, {
		version: LIFECYCLE_SPEC_VERSION,
		policy: BOARDING_LIFECYCLE_POLICY,
		visibility: BOARDING_VISIBILITY,
		transitions: BOARDING_TRANSITIONS,
	});
}

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
			boarding: (boarding as Record<string, unknown>[]).map(
				transformBoardingDoc,
			),
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

		sendSuccess(res, {
			boarding: transformBoardingDoc(boarding as Record<string, unknown>),
		});
	} catch (error) {
		next(error);
	}
}

// GET /api/boardings/my-listings  (owner)
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

		sendSuccess(res, {
			boardings: (boardings as Record<string, unknown>[]).map(
				transformBoardingDoc,
			),
		});
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
			{
				boarding: transformBoardingDoc(
					completeBoarding as Record<string, unknown>,
				),
			},
			"Boarding Created Successfully",
			201,
		);
	} catch (error) {
		next(error);
	}
}

// PUT /api/boardings/:id  (owner)
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

		await boardingWorkflowService.updateBoarding(id, ownerId, body);
		const updatedBoarding = await getPopulatedBoardingById(id);
		sendSuccess(
			res,
			{
				boarding: transformBoardingDoc(updatedBoarding as Record<string, unknown>),
			},
			"Boarding updated successfully",
		);
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
		await boardingWorkflowService.submitForReview(id, ownerId);
		const boarding = await getPopulatedBoardingById(id);

		sendSuccess(
			res,
			{ boarding: transformBoardingDoc(boarding as Record<string, unknown>) },
			"Boarding Submitted for Approval",
		);
	} catch (error) {
		next(error);
	}
}

// PATCH /api/boardings/:id/deactivate  (owner)
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

		await boardingWorkflowService.deactivate(id, ownerId);
		const boarding = await getPopulatedBoardingById(id);

		sendSuccess(
			res,
			{ boarding: transformBoardingDoc(boarding as Record<string, unknown>) },
			"Boarding deactivated successfully",
		);
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
		await boardingWorkflowService.reactivate(id, ownerId);
		const boarding = await getPopulatedBoardingById(id);

		sendSuccess(
			res,
			{ boarding: transformBoardingDoc(boarding as Record<string, unknown>) },
			"Boarding activated successfully",
		);
	} catch (err) {
		next(err);
	}
}

// PATCH /api/boardings/:id/archive  (owner)
export async function archiveBoarding(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user?.userId) {
			throw new ForbiddenError("User is not authenticated");
		}
		const { id } = req.params as { id: string };
		await boardingWorkflowService.archive(id, req.user.userId);
		sendSuccess(res, { id, isDeleted: true }, "Boarding archived successfully");
	} catch (error) {
		next(error);
	}
}

// PATCH /api/boardings/:id/restore  (owner)
export async function restoreBoarding(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user?.userId) {
			throw new ForbiddenError("User is not authenticated");
		}
		const { id } = req.params as { id: string };
		await boardingWorkflowService.restore(id, req.user.userId);
		sendSuccess(res, { id, isDeleted: false }, "Boarding restored successfully");
	} catch (error) {
		next(error);
	}
}

// GET /api/boardings/:id/status-history
export async function getBoardingStatusHistory(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		if (!req.user?.userId || !req.user?.role) {
			throw new ForbiddenError("User is not authenticated");
		}
		const { id } = req.params as { id: string };
		const history = await boardingWorkflowService.getHistory(
			id,
			req.user.userId,
			req.user.role as Role,
		);
		sendSuccess(res, {
			history: (history as Record<string, unknown>[]).map(addId),
		});
	} catch (error) {
		next(error);
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
