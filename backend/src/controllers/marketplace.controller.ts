import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import {
	ForbiddenError,
	NotFoundError,
	ValidationError,
} from "@/errors/AppError.js";
import { deleteBoardingImage, uploadBoardingImage } from "@/lib/cloudinary.js";
import { sendSuccess } from "@/lib/response.js";
import { MAX_MARKETPLACE_IMAGES } from "@/middleware/upload.js";
import { MarketplaceItem, MarketplaceReport } from "@/models/index.js";
import type {
	CreateMarketplaceItemInput,
	ReportMarketplaceItemInput,
	ResolveMarketplaceReportInput,
	SearchMarketplaceQuery,
	UpdateMarketplaceItemInput,
} from "@/schemas/marketplace.validators.js";
import {
	MarketplaceAdType,
	MarketplaceReportStatus,
	MarketplaceStatus,
} from "@/types/enums.js";
import { addId } from "@/utils/index.js";

function assertAuthenticatedUser(req: Request): string {
	if (!req.user?.userId) {
		throw new ForbiddenError("User is not authenticated");
	}
	return req.user.userId;
}

function transformMarketplaceItemDoc(doc: Record<string, unknown>) {
	const sellerRef = doc.sellerId as Record<string, unknown> | string;
	const sellerPopulated =
		typeof sellerRef === "object" && sellerRef !== null && "_id" in sellerRef;

	const seller = sellerPopulated
		? addId(sellerRef as Record<string, unknown>)
		: undefined;
	const sellerId = sellerPopulated
		? String((sellerRef as Record<string, unknown>)._id)
		: String(sellerRef);

	const images = Array.isArray(doc.images)
		? (doc.images as Record<string, unknown>[]).map(addId)
		: [];

	return {
		...addId(doc),
		sellerId,
		...(seller ? { seller } : {}),
		images,
	};
}

function buildPublicMarketplaceQuery(params: SearchMarketplaceQuery) {
	const query: Record<string, unknown> = {
		status: MarketplaceStatus.ACTIVE,
		isDeleted: false,
	};

	if (params.search) {
		query.$or = [
			{ title: new RegExp(params.search, "i") },
			{ description: new RegExp(params.search, "i") },
			{ category: new RegExp(params.search, "i") },
		];
	}

	if (params.adType) {
		query.adType = params.adType;
	}

	if (params.category) {
		query.category = new RegExp(`^${params.category}$`, "i");
	}

	if (params.city) {
		query.city = new RegExp(`^${params.city}$`, "i");
	}

	if (params.district) {
		query.district = new RegExp(`^${params.district}$`, "i");
	}

	if (params.minPrice !== undefined || params.maxPrice !== undefined) {
		query.price = {} as Record<string, number>;
		if (params.minPrice !== undefined) {
			(query.price as Record<string, number>).$gte = params.minPrice;
		}
		if (params.maxPrice !== undefined) {
			(query.price as Record<string, number>).$lte = params.maxPrice;
		}
	}

	return query;
}

export async function searchMarketplaceItems(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const queryParams = req.query as unknown as SearchMarketplaceQuery;
		const query = buildPublicMarketplaceQuery(queryParams);
		const sortField = queryParams.sortBy === "price" ? "price" : "createdAt";
		const sortOrder = queryParams.sortDir === "asc" ? 1 : -1;

		const [items, total] = await Promise.all([
			MarketplaceItem.find(query)
				.populate("sellerId", "firstName lastName phone")
				.sort({ [sortField]: sortOrder })
				.skip((queryParams.page - 1) * queryParams.size)
				.limit(queryParams.size)
				.lean(),
			MarketplaceItem.countDocuments(query),
		]);

		sendSuccess(res, {
			items: (items as Record<string, unknown>[]).map(transformMarketplaceItemDoc),
			pagination: {
				total,
				page: queryParams.page,
				size: queryParams.size,
				totalPages: Math.ceil(total / queryParams.size),
			},
		});
	} catch (error) {
		next(error);
	}
}

export async function getMarketplaceItemById(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { id } = req.params as { id: string };
		const item = await MarketplaceItem.findById(id)
			.populate("sellerId", "firstName lastName phone")
			.lean();

		if (!item || item.isDeleted || item.status !== MarketplaceStatus.ACTIVE) {
			throw new NotFoundError("Marketplace item");
		}

		sendSuccess(res, {
			item: transformMarketplaceItemDoc(item as Record<string, unknown>),
		});
	} catch (error) {
		next(error);
	}
}

export async function getMyMarketplaceItems(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const userId = assertAuthenticatedUser(req);

		const items = await MarketplaceItem.find({
			sellerId: new mongoose.Types.ObjectId(userId),
			isDeleted: false,
		})
			.populate("sellerId", "firstName lastName phone")
			.sort({ createdAt: -1 })
			.lean();

		sendSuccess(res, {
			items: (items as Record<string, unknown>[]).map(transformMarketplaceItemDoc),
		});
	} catch (error) {
		next(error);
	}
}

export async function createMarketplaceItem(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const userId = assertAuthenticatedUser(req);
		const payload = req.body as CreateMarketplaceItemInput;

		const item = await MarketplaceItem.create({
			...payload,
			sellerId: userId,
			price: payload.adType === MarketplaceAdType.SELL ? payload.price : undefined,
		});

		const created = await MarketplaceItem.findById(item._id)
			.populate("sellerId", "firstName lastName phone")
			.lean();

		sendSuccess(
			res,
			{ item: transformMarketplaceItemDoc(created as Record<string, unknown>) },
			"Marketplace item created successfully",
			201,
		);
	} catch (error) {
		next(error);
	}
}

export async function updateMarketplaceItem(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const userId = assertAuthenticatedUser(req);
		const { id } = req.params as { id: string };
		const payload = req.body as UpdateMarketplaceItemInput;

		const existing = await MarketplaceItem.findById(id);
		if (!existing || existing.isDeleted) {
			throw new NotFoundError("Marketplace item");
		}

		if (String(existing.sellerId) !== userId) {
			throw new ForbiddenError("You can only edit your own listing");
		}

		const nextAdType = payload.adType ?? existing.adType;
		const nextPrice = payload.price ?? existing.price;

		if (nextAdType === MarketplaceAdType.SELL && !nextPrice) {
			throw new ValidationError("Price is required for SELL listings");
		}

		if (nextAdType === MarketplaceAdType.GIVEAWAY) {
			payload.price = undefined;
		}

		const updated = await MarketplaceItem.findByIdAndUpdate(id, payload, {
			new: true,
		})
			.populate("sellerId", "firstName lastName phone")
			.lean();

		sendSuccess(res, {
			item: transformMarketplaceItemDoc(updated as Record<string, unknown>),
		});
	} catch (error) {
		next(error);
	}
}

export async function deleteMarketplaceItem(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const userId = assertAuthenticatedUser(req);
		const { id } = req.params as { id: string };

		const existing = await MarketplaceItem.findById(id);
		if (!existing || existing.isDeleted) {
			throw new NotFoundError("Marketplace item");
		}

		if (String(existing.sellerId) !== userId) {
			throw new ForbiddenError("You can only delete your own listing");
		}

		await MarketplaceItem.findByIdAndUpdate(id, {
			isDeleted: true,
			status: MarketplaceStatus.REMOVED,
		});

		sendSuccess(res, null, "Marketplace item removed successfully");
	} catch (error) {
		next(error);
	}
}

export async function uploadMarketplaceImages(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const userId = assertAuthenticatedUser(req);
		const { id } = req.params as { id: string };
		const files = req.files as Express.Multer.File[] | undefined;

		if (!files || files.length === 0) {
			throw new ValidationError("At least one image is required");
		}

		const item = await MarketplaceItem.findById(id);
		if (!item || item.isDeleted) {
			throw new NotFoundError("Marketplace item");
		}

		if (String(item.sellerId) !== userId) {
			throw new ForbiddenError("You can only upload images to your own listing");
		}

		if (item.images.length + files.length > MAX_MARKETPLACE_IMAGES) {
			throw new ValidationError(
				`Maximum ${MAX_MARKETPLACE_IMAGES} images are allowed per listing`,
			);
		}

		const uploaded = await Promise.all(
			files.map((file) => uploadBoardingImage(file.buffer, file.mimetype)),
		);

		item.images.push(
			...uploaded.map((image) => ({
				url: image.url,
				publicId: image.publicId,
				createdAt: new Date(),
			})),
		);
		await item.save();

		sendSuccess(res, {
			images: item.images.map((image) =>
				addId(image as unknown as Record<string, unknown>),
			),
		});
	} catch (error) {
		next(error);
	}
}

export async function deleteMarketplaceImage(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const userId = assertAuthenticatedUser(req);
		const { id, imageId } = req.params as { id: string; imageId: string };

		const item = await MarketplaceItem.findById(id);
		if (!item || item.isDeleted) {
			throw new NotFoundError("Marketplace item");
		}

		if (String(item.sellerId) !== userId) {
			throw new ForbiddenError("You can only edit your own listing images");
		}

		const image = item.images.find((img) => String(img._id) === imageId);
		if (!image) {
			throw new NotFoundError("Marketplace image");
		}

		await deleteBoardingImage(image.publicId);
		item.images = item.images.filter((img) => String(img._id) !== imageId);
		await item.save();

		sendSuccess(res, null, "Marketplace image deleted successfully");
	} catch (error) {
		next(error);
	}
}

export async function reportMarketplaceItem(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const userId = assertAuthenticatedUser(req);
		const { id } = req.params as { id: string };
		const payload = req.body as ReportMarketplaceItemInput;

		const item = await MarketplaceItem.findById(id);
		if (!item || item.isDeleted || item.status !== MarketplaceStatus.ACTIVE) {
			throw new NotFoundError("Marketplace item");
		}

		if (String(item.sellerId) === userId) {
			throw new ValidationError("You cannot report your own listing");
		}

		const existingOpen = await MarketplaceReport.findOne({
			itemId: item._id,
			reporterId: new mongoose.Types.ObjectId(userId),
			status: MarketplaceReportStatus.OPEN,
		});

		if (existingOpen) {
			throw new ValidationError("You already reported this listing");
		}

		await MarketplaceReport.create({
			itemId: item._id,
			reporterId: new mongoose.Types.ObjectId(userId),
			reason: payload.reason,
			details: payload.details,
		});

		await MarketplaceItem.findByIdAndUpdate(item._id, {
			$inc: { reportCount: 1 },
			$set: { lastReportedAt: new Date() },
		});

		sendSuccess(res, null, "Listing reported successfully", 201);
	} catch (error) {
		next(error);
	}
}

export async function getOpenMarketplaceReports(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const reports = await MarketplaceReport.find({
			status: MarketplaceReportStatus.OPEN,
		})
			.populate("itemId")
			.populate("reporterId", "firstName lastName email")
			.sort({ createdAt: -1 })
			.lean();

		sendSuccess(res, {
			reports: (reports as Record<string, unknown>[]).map((report) => ({
				...addId(report),
				itemId:
					typeof report.itemId === "object" && report.itemId !== null
						? addId(report.itemId as Record<string, unknown>)
						: report.itemId,
				reporterId:
					typeof report.reporterId === "object" && report.reporterId !== null
						? addId(report.reporterId as Record<string, unknown>)
						: report.reporterId,
			})),
		});
	} catch (error) {
		next(error);
	}
}

export async function takedownMarketplaceItem(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { id } = req.params as { id: string };
		const { reason } = req.body as { reason?: string };

		const item = await MarketplaceItem.findByIdAndUpdate(
			id,
			{
				status: MarketplaceStatus.TAKEN_DOWN,
				takedownReason: reason,
			},
			{ new: true },
		)
			.populate("sellerId", "firstName lastName phone")
			.lean();

		if (!item || item.isDeleted) {
			throw new NotFoundError("Marketplace item");
		}

		sendSuccess(res, {
			item: transformMarketplaceItemDoc(item as Record<string, unknown>),
		});
	} catch (error) {
		next(error);
	}
}

export async function reinstateMarketplaceItem(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { id } = req.params as { id: string };
		const item = await MarketplaceItem.findByIdAndUpdate(
			id,
			{
				status: MarketplaceStatus.ACTIVE,
				takedownReason: null,
			},
			{ new: true },
		)
			.populate("sellerId", "firstName lastName phone")
			.lean();

		if (!item || item.isDeleted) {
			throw new NotFoundError("Marketplace item");
		}

		sendSuccess(res, {
			item: transformMarketplaceItemDoc(item as Record<string, unknown>),
		});
	} catch (error) {
		next(error);
	}
}

export async function resolveMarketplaceReport(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const userId = assertAuthenticatedUser(req);
		const { reportId } = req.params as { reportId: string };
		const payload = req.body as ResolveMarketplaceReportInput;

		const report = await MarketplaceReport.findByIdAndUpdate(
			reportId,
			{
				status: payload.status,
				handledBy: new mongoose.Types.ObjectId(userId),
				handledAt: new Date(),
				notes: payload.notes,
			},
			{ new: true },
		).lean();

		if (!report) {
			throw new NotFoundError("Marketplace report");
		}

		sendSuccess(res, {
			report: addId(report as Record<string, unknown>),
		});
	} catch (error) {
		next(error);
	}
}
