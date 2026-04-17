import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import {
	BoardingNotFoundError,
	BadRequestError,
	InvalidStateTransitionError,
	NotFoundError,
	UserNotFoundError,
} from "@/errors/AppError.js";
import { sendSuccess } from "@/lib/response.js";
import {
	AdminAction,
	Boarding,
	MarketplaceItem,
	MarketplaceReport,
	Payment,
	RentalPeriod,
	Reservation,
	Review,
	User,
	VisitRequest,
} from "@/models/index.js";
import type {
	AdminBulkConfirmPaymentsInput,
	AdminBulkDeleteReviewsInput,
	AdminBulkRejectPaymentsInput,
	AdminBulkUserStatusInput,
	AdminListBoardingsQuery,
	AdminListMarketplaceQuery,
	AdminListActionsQuery,
	AdminListPaymentsQuery,
	AdminListReservationsQuery,
	AdminListVisitRequestsQuery,
	AdminListReviewsQuery,
	AdminRejectPaymentInput,
	AdminSetBoardingStatusInput,
	AdminSetMarketplaceStatusInput,
} from "@/schemas/admin.validators.js";
import type { RejectBoardingInput } from "@/schemas/boarding.validators.js";
import type { AdminListUsersQuery } from "@/schemas/user.validators.js";
import {
	BoardingStatus,
	MarketplaceStatus,
	MarketplaceReportStatus,
	PaymentStatus,
	RentalPeriodStatus,
	ReservationStatus,
	VisitRequestStatus,
} from "@/types/enums.js";
import {
	addId,
	transformBoardingDoc,
	transformPaymentDoc,
	transformReservationDoc,
	transformVisitRequestDoc,
} from "@/utils/index.js";

async function recalcRentalPeriodStatus(rentalPeriodId: string): Promise<void> {
	const rentalPeriod = await RentalPeriod.findById(rentalPeriodId);

	if (!rentalPeriod) return;

	const payments = await Payment.find({
		rentalPeriodId: new mongoose.Types.ObjectId(rentalPeriodId),
	});

	const confirmedTotal = payments
		.filter((payment) => payment.status === PaymentStatus.CONFIRMED)
		.reduce((sum, payment) => sum + payment.amount, 0);

	let nextStatus = rentalPeriod.status;

	if (confirmedTotal >= rentalPeriod.amountDue) {
		nextStatus = RentalPeriodStatus.PAID;
	} else if (confirmedTotal > 0) {
		nextStatus = RentalPeriodStatus.PARTIALLY_PAID;
	}

	if (nextStatus !== rentalPeriod.status) {
		await RentalPeriod.findByIdAndUpdate(rentalPeriodId, { status: nextStatus });
	}
}

function getRequestIp(req: Request): string | undefined {
	const headerIp = req.headers["x-forwarded-for"];
	if (typeof headerIp === "string") {
		return headerIp.split(",")[0]?.trim();
	}
	return req.ip;
}

async function logAdminAction(
	req: Request,
	action: string,
	targetType: "USER" | "BOARDING" | "PAYMENT" | "REVIEW" | "SYSTEM",
	targetIds: string[],
	metadata?: Record<string, unknown>,
): Promise<void> {
	if (!req.user?.userId) return;

	try {
		await AdminAction.create({
			adminId: new mongoose.Types.ObjectId(req.user.userId),
			action,
			targetType,
			targetIds,
			metadata,
			ipAddress: getRequestIp(req),
			userAgent: req.headers["user-agent"],
		});
	} catch {
		// intentionally non-blocking to keep primary admin action reliable
	}
}

function transformMarketplaceItemForAdmin(doc: Record<string, unknown>) {
	const sellerRef = doc.sellerId as Record<string, unknown> | string;
	const sellerPopulated =
		typeof sellerRef === "object" && sellerRef !== null && "_id" in sellerRef;

	return {
		...addId(doc),
		sellerId: sellerPopulated
			? String((sellerRef as Record<string, unknown>)._id)
			: String(sellerRef),
		...(sellerPopulated
			? { seller: addId(sellerRef as Record<string, unknown>) }
			: {}),
		images: Array.isArray(doc.images)
			? (doc.images as Record<string, unknown>[]).map(addId)
			: [],
	};
}

// GET /api/admin/users
export async function listUsers(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { page, size, role, active, search } =
			req.query as unknown as AdminListUsersQuery;

		const escapedSearch =
			search && search.length > 0
				? search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
				: undefined;
		const searchRegex = escapedSearch ? new RegExp(escapedSearch, "i") : undefined;

		const filters = {
			...(role !== undefined ? { role } : {}),
			...(active !== undefined ? { isActive: active } : {}),
			...(searchRegex
				? {
						$or: [
							{ firstName: searchRegex },
							{ lastName: searchRegex },
							{ email: searchRegex },
							{ phone: searchRegex },
						],
					}
				: {}),
		};

		const [users, total] = await Promise.all([
			User.find(filters)
				.select("-passwordHash")
				.skip((page - 1) * size)
				.limit(size)
				.sort({ createdAt: -1 })
				.lean(),

			User.countDocuments(filters),
		]);

		sendSuccess(res, {
			users: (users as Record<string, unknown>[]).map(addId),
			pagination: {
				total,
				page,
				size,
				totalPages: Math.ceil(total / size),
			},
		});
	} catch (error) {
		next(error);
	}
}

// GET /api/admin/users/:id
export async function getUserById(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const id = req.params.id as string;

		if (!mongoose.Types.ObjectId.isValid(id)) {
			throw new UserNotFoundError();
		}

		const user = await User.findById(id).select("-passwordHash").lean();

		if (!user) throw new UserNotFoundError();

		sendSuccess(res, addId(user as Record<string, unknown>));
	} catch (error) {
		next(error);
	}
}

// PATCH /api/admin/users/:id/activate
export async function activateUser(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const id = req.params.id as string;

		const existing = await User.findById(id);

		if (!existing) throw new UserNotFoundError();

		const user = await User.findByIdAndUpdate(
			id,
			{ isActive: true },
			{ new: true },
		).lean();

		if (!user) throw new UserNotFoundError();

		await logAdminAction(req, "USER_ACTIVATE", "USER", [id]);

		sendSuccess(
			res,
			{ id: user._id.toString(), isActive: user.isActive },
			"User activated successfully",
		);
	} catch (err) {
		next(err);
	}
}

// PATCH /api/admin/users/:id/deactivate
export async function deactivateUser(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const id = req.params.id as string;

		const existing = await User.findById(id);

		if (!existing) throw new UserNotFoundError();

		const user = await User.findByIdAndUpdate(
			id,
			{ isActive: false },
			{ new: true },
		).lean();

		if (!user) throw new UserNotFoundError();

		await logAdminAction(req, "USER_DEACTIVATE", "USER", [id]);

		sendSuccess(
			res,
			{ id: user._id.toString(), isActive: user.isActive },
			"User deactivated successfully",
		);
	} catch (err) {
		next(err);
	}
}

// GET /api/admin/boardings
export async function listBoardings(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { page, size, status, search } =
			req.query as unknown as AdminListBoardingsQuery;

		const escapedSearch =
			search && search.length > 0
				? search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
				: undefined;
		const searchRegex = escapedSearch ? new RegExp(escapedSearch, "i") : undefined;

		const filters: Record<string, unknown> = {
			isDeleted: false,
			...(status ? { status } : {}),
			...(searchRegex
				? {
					$or: [
						{ title: searchRegex },
						{ city: searchRegex },
						{ district: searchRegex },
						{ slug: searchRegex },
					],
				}
				: {}),
		};

		const [boardings, total] = await Promise.all([
			Boarding.find(filters)
				.populate("ownerId", "firstName lastName phone email")
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
				.skip((page - 1) * size)
				.limit(size)
				.lean(),
			Boarding.countDocuments(filters),
		]);

		sendSuccess(res, {
			boardings: (boardings as Record<string, unknown>[]).map(transformBoardingDoc),
			pagination: {
				total,
				page,
				size,
				totalPages: Math.ceil(total / size),
			},
		});
	} catch (error) {
		next(error);
	}
}

// PATCH /api/admin/boardings/:id/status
export async function setBoardingStatusByAdmin(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { id } = req.params as { id: string };
		const { status, reason } = req.body as AdminSetBoardingStatusInput;

		if (status === BoardingStatus.REJECTED && !reason) {
			throw new BadRequestError("Reason is required when rejecting a boarding");
		}

		const existing = await Boarding.findById(id);
		if (!existing || existing.isDeleted) {
			throw new BoardingNotFoundError();
		}

		const boarding = await Boarding.findByIdAndUpdate(
			id,
			{
				status,
				rejectionReason: status === BoardingStatus.REJECTED ? reason : null,
			},
			{ new: true },
		)
			.populate("ownerId", "firstName lastName phone email")
			.lean();

		await logAdminAction(req, "BOARDING_STATUS_UPDATE", "BOARDING", [id], {
			status,
			reason,
		});

		sendSuccess(
			res,
			{ boarding: transformBoardingDoc(boarding as Record<string, unknown>) },
			"Boarding status updated",
		);
	} catch (error) {
		next(error);
	}
}

// GET /api/admin/boardings/pending
export async function listPendingBoardings(
	_req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const boardings = await Boarding.find({
			status: BoardingStatus.PENDING_APPROVAL,
			isDeleted: false,
		})
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
			.sort({ updatedAt: 1 })
			.lean();

		sendSuccess(res, {
			boardings: (boardings as Record<string, unknown>[]).map(
				transformBoardingDoc,
			),
		});
	} catch (err) {
		next(err);
	}
}

// PATCH /api/admin/boardings/:id/approve
export async function approveBoarding(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { id } = req.params as { id: string };

		const existing = await Boarding.findById(id);

		if (!existing || existing.isDeleted) throw new BoardingNotFoundError();

		if (existing.status !== BoardingStatus.PENDING_APPROVAL) {
			throw new InvalidStateTransitionError(
				"Only PENDING_APPROVAL listings can be approved",
			);
		}

		const boarding = await Boarding.findByIdAndUpdate(
			id,
			{ status: BoardingStatus.ACTIVE, rejectionReason: null },
			{ new: true },
		)
			.select("id status title updatedAt")
			.lean();

		await logAdminAction(req, "BOARDING_APPROVE", "BOARDING", [id]);

		sendSuccess(
			res,
			{ boarding: addId(boarding as Record<string, unknown>) },
			"Boarding approved successfully",
		);
	} catch (err) {
		next(err);
	}
}

// PATCH /api/admin/boardings/:id/reject
export async function rejectBoarding(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { id } = req.params as { id: string };
		const { reason } = req.body as RejectBoardingInput;

		const existing = await Boarding.findById(id);

		if (!existing || existing.isDeleted) throw new BoardingNotFoundError();

		if (existing.status !== BoardingStatus.PENDING_APPROVAL) {
			throw new InvalidStateTransitionError(
				"Only PENDING_APPROVAL listings can be rejected",
			);
		}

		const boarding = await Boarding.findByIdAndUpdate(
			id,
			{
				status: BoardingStatus.REJECTED,
				rejectionReason: reason,
			},
			{ new: true },
		)
			.select("id status title rejectionReason updatedAt")
			.lean();

		await logAdminAction(req, "BOARDING_REJECT", "BOARDING", [id], {
			reason,
		});

		sendSuccess(
			res,
			{ boarding: addId(boarding as Record<string, unknown>) },
			"Boarding rejected successfully",
		);
	} catch (err) {
		next(err);
	}
}

// GET /api/admin/dashboard/kpis
export async function getAdminDashboardKpis(
	_req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const now = new Date();
		const [
			totalUsers,
			activeUsers,
			pendingBoardings,
			openMarketplaceReports,
			pendingReservations,
			pendingVisitRequests,
			pendingPayments,
			totalReviews,
		] = await Promise.all([
			User.countDocuments(),
			User.countDocuments({ isActive: true }),
			Boarding.countDocuments({
				status: BoardingStatus.PENDING_APPROVAL,
				isDeleted: false,
			}),
			MarketplaceReport.countDocuments({ status: MarketplaceReportStatus.OPEN }),
			Reservation.countDocuments({ status: ReservationStatus.PENDING }),
			VisitRequest.countDocuments({
				status: VisitRequestStatus.PENDING,
				expiresAt: { $gt: now },
			}),
			Payment.countDocuments({ status: PaymentStatus.PENDING }),
			Review.countDocuments(),
		]);

		sendSuccess(res, {
			users: {
				total: totalUsers,
				active: activeUsers,
				inactive: Math.max(totalUsers - activeUsers, 0),
			},
			moderation: {
				pendingBoardings,
				openMarketplaceReports,
				pendingReservations,
				pendingVisitRequests,
				pendingPayments,
				totalReviews,
			},
		});
	} catch (error) {
		next(error);
	}
}

// GET /api/admin/reservations
export async function listReservations(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { page, size, status, search } =
			req.query as unknown as AdminListReservationsQuery;
		const { createdFrom, createdTo } =
			req.query as unknown as AdminListReservationsQuery;

		const escapedSearch =
			search && search.length > 0
				? search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
				: undefined;
		const searchRegex = escapedSearch ? new RegExp(escapedSearch, "i") : undefined;

		const filters: Record<string, unknown> = {
			...(status ? { status } : {}),
			...(searchRegex
				? {
					$or: [
						{ "boardingSnapshot.title": searchRegex },
						{ specialRequests: searchRegex },
					],
				}
				: {}),
		};

		if (createdFrom || createdTo) {
			filters.createdAt = {
				...(createdFrom ? { $gte: new Date(createdFrom) } : {}),
				...(createdTo ? { $lte: new Date(createdTo) } : {}),
			};
		}

		const [reservations, total] = await Promise.all([
			Reservation.find(filters)
				.populate("studentId", "firstName lastName email")
				.populate("boardingId", "title slug city district")
				.sort({ createdAt: -1 })
				.skip((page - 1) * size)
				.limit(size)
				.lean(),
			Reservation.countDocuments(filters),
		]);

		sendSuccess(res, {
			reservations: (reservations as Record<string, unknown>[]).map(
				transformReservationDoc,
			),
			pagination: {
				total,
				page,
				size,
				totalPages: Math.ceil(total / size),
			},
		});
	} catch (error) {
		next(error);
	}
}

// GET /api/admin/visit-requests
export async function listVisitRequests(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { page, size, status, search } =
			req.query as unknown as AdminListVisitRequestsQuery;
		const { createdFrom, createdTo } =
			req.query as unknown as AdminListVisitRequestsQuery;

		const escapedSearch =
			search && search.length > 0
				? search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
				: undefined;
		const searchRegex = escapedSearch ? new RegExp(escapedSearch, "i") : undefined;

		const filters: Record<string, unknown> = {
			...(status ? { status } : {}),
			...(searchRegex
				? {
						$or: [
							{ "boardingSnapshot.title": searchRegex },
							{ message: searchRegex },
							{ rejectionReason: searchRegex },
						],
					}
				: {}),
		};

		if (createdFrom || createdTo) {
			filters.createdAt = {
				...(createdFrom ? { $gte: new Date(createdFrom) } : {}),
				...(createdTo ? { $lte: new Date(createdTo) } : {}),
			};
		}

		const now = new Date();
		if (status === VisitRequestStatus.PENDING) {
			filters.expiresAt = { $gt: now };
		} else if (status === VisitRequestStatus.EXPIRED) {
			filters.$or = [
				{ status: VisitRequestStatus.EXPIRED },
				{ status: VisitRequestStatus.PENDING, expiresAt: { $lte: now } },
			];
			delete filters.status;
		}

		const [visitRequests, total] = await Promise.all([
			VisitRequest.find(filters)
				.populate("studentId", "firstName lastName email")
				.populate("boardingId", "title slug city district")
				.sort({ createdAt: -1 })
				.skip((page - 1) * size)
				.limit(size)
				.lean(),
			VisitRequest.countDocuments(filters),
		]);

		sendSuccess(res, {
			visitRequests: (visitRequests as Record<string, unknown>[]).map((visit) => {
				const transformed = transformVisitRequestDoc(visit);
				if (
					transformed.status === VisitRequestStatus.PENDING &&
					new Date(String(transformed.expiresAt)) <= now
				) {
					return {
						...transformed,
						status: VisitRequestStatus.EXPIRED,
					};
				}
				return transformed;
			}),
			pagination: {
				total,
				page,
				size,
				totalPages: Math.ceil(total / size),
			},
		});
	} catch (error) {
		next(error);
	}
}

// GET /api/admin/payments
export async function listPayments(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { page, size, status, search } =
			req.query as unknown as AdminListPaymentsQuery;
		const { minAmount, maxAmount, createdFrom, createdTo } =
			req.query as unknown as AdminListPaymentsQuery;

		const escapedSearch =
			search && search.length > 0
				? search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
				: undefined;
		const searchRegex = escapedSearch ? new RegExp(escapedSearch, "i") : undefined;

		const filters: Record<string, unknown> = {
			...(status ? { status } : {}),
			...(searchRegex
				? {
					$or: [{ referenceNumber: searchRegex }, { proofImageUrl: searchRegex }],
				}
				: {}),
		};

		if (minAmount !== undefined || maxAmount !== undefined) {
			filters.amount = {
				...(minAmount !== undefined ? { $gte: minAmount } : {}),
				...(maxAmount !== undefined ? { $lte: maxAmount } : {}),
			};
		}

		if (createdFrom || createdTo) {
			filters.createdAt = {
				...(createdFrom ? { $gte: new Date(createdFrom) } : {}),
				...(createdTo ? { $lte: new Date(createdTo) } : {}),
			};
		}

		const [payments, total] = await Promise.all([
			Payment.find(filters)
				.populate({
					path: "rentalPeriodId",
					select: "periodLabel dueDate amountDue status",
				})
				.populate({
					path: "reservationId",
					populate: {
						path: "boardingId",
						select: "title",
					},
				})
				.sort({ createdAt: -1 })
				.skip((page - 1) * size)
				.limit(size)
				.lean(),
			Payment.countDocuments(filters),
		]);

		sendSuccess(res, {
			payments: (payments as Record<string, unknown>[]).map(transformPaymentDoc),
			pagination: {
				total,
				page,
				size,
				totalPages: Math.ceil(total / size),
			},
		});
	} catch (error) {
		next(error);
	}
}

// PATCH /api/admin/payments/:id/confirm
export async function confirmPaymentByAdmin(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { id } = req.params as { id: string };
		const existing = await Payment.findById(id).lean();

		if (!existing) {
			throw new NotFoundError("Payment");
		}

		if (existing.status !== PaymentStatus.PENDING) {
			throw new BadRequestError("Only PENDING payments can be confirmed");
		}

		await Payment.findByIdAndUpdate(id, {
			status: PaymentStatus.CONFIRMED,
			confirmedAt: new Date(),
			rejectionReason: null,
		});

		await recalcRentalPeriodStatus(existing.rentalPeriodId.toString());

		await logAdminAction(req, "PAYMENT_CONFIRM", "PAYMENT", [id]);

		const payment = await Payment.findById(id).lean();

		sendSuccess(
			res,
			{ payment: addId(payment as Record<string, unknown>) },
			"Payment confirmed",
		);
	} catch (error) {
		next(error);
	}
}

// PATCH /api/admin/payments/:id/reject
export async function rejectPaymentByAdmin(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { id } = req.params as { id: string };
		const { reason } = req.body as AdminRejectPaymentInput;

		const existing = await Payment.findById(id).lean();

		if (!existing) {
			throw new NotFoundError("Payment");
		}

		if (existing.status !== PaymentStatus.PENDING) {
			throw new BadRequestError("Only PENDING payments can be rejected");
		}

		await Payment.findByIdAndUpdate(id, {
			status: PaymentStatus.REJECTED,
			rejectionReason: reason,
			confirmedAt: null,
		});

		const payment = await Payment.findById(id).lean();

		await logAdminAction(req, "PAYMENT_REJECT", "PAYMENT", [id], { reason });

		sendSuccess(
			res,
			{ payment: addId(payment as Record<string, unknown>) },
			"Payment rejected",
		);
	} catch (error) {
		next(error);
	}
}

// GET /api/admin/reviews
export async function listReviews(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { page, size, minRating, maxRating, search, createdFrom, createdTo } =
			req.query as unknown as AdminListReviewsQuery;

		const escapedSearch =
			search && search.length > 0
				? search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
				: undefined;
		const searchRegex = escapedSearch ? new RegExp(escapedSearch, "i") : undefined;

		const filters: Record<string, unknown> = {
			...((minRating !== undefined || maxRating !== undefined)
				? {
					rating: {
						...(minRating !== undefined ? { $gte: minRating } : {}),
						...(maxRating !== undefined ? { $lte: maxRating } : {}),
					},
				}
				: {}),
			...(searchRegex
				? {
					$or: [{ comment: searchRegex }, { images: searchRegex }],
				}
				: {}),
		};

		if (createdFrom || createdTo) {
			filters.createdAt = {
				...(createdFrom ? { $gte: new Date(createdFrom) } : {}),
				...(createdTo ? { $lte: new Date(createdTo) } : {}),
			};
		}

		const [reviews, total] = await Promise.all([
			Review.find(filters)
				.populate("studentId", "firstName lastName email")
				.populate("boardingId", "title slug city district")
				.sort({ createdAt: -1 })
				.skip((page - 1) * size)
				.limit(size)
				.lean(),
			Review.countDocuments(filters),
		]);

		sendSuccess(res, {
			reviews: (reviews as Record<string, unknown>[]).map((review) => ({
				...addId(review),
				studentId:
					typeof review.studentId === "object" && review.studentId !== null
						? addId(review.studentId as Record<string, unknown>)
						: review.studentId,
				boardingId:
					typeof review.boardingId === "object" && review.boardingId !== null
						? addId(review.boardingId as Record<string, unknown>)
						: review.boardingId,
			})),
			pagination: {
				total,
				page,
				size,
				totalPages: Math.ceil(total / size),
			},
		});
	} catch (error) {
		next(error);
	}
}

// DELETE /api/admin/reviews/:id
export async function deleteReviewByAdmin(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { id } = req.params as { id: string };
		const deleted = await Review.findByIdAndDelete(id).lean();

		if (!deleted) {
			throw new NotFoundError("Review");
		}

		await logAdminAction(req, "REVIEW_DELETE", "REVIEW", [id]);

		sendSuccess(res, null, "Review deleted successfully");
	} catch (error) {
		next(error);
	}
}

// GET /api/admin/marketplace
export async function listMarketplaceItemsByAdmin(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { page, size, status, search } =
			req.query as unknown as AdminListMarketplaceQuery;

		const escapedSearch =
			search && search.length > 0
				? search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
				: undefined;
		const searchRegex = escapedSearch ? new RegExp(escapedSearch, "i") : undefined;

		const filters: Record<string, unknown> = {
			isDeleted: false,
			...(status ? { status } : {}),
			...(searchRegex
				? {
					$or: [
						{ title: searchRegex },
						{ description: searchRegex },
						{ category: searchRegex },
						{ city: searchRegex },
						{ district: searchRegex },
					],
				}
				: {}),
		};

		const [items, total] = await Promise.all([
			MarketplaceItem.find(filters)
				.populate("sellerId", "firstName lastName phone email")
				.sort({ createdAt: -1 })
				.skip((page - 1) * size)
				.limit(size)
				.lean(),
			MarketplaceItem.countDocuments(filters),
		]);

		sendSuccess(res, {
			items: (items as Record<string, unknown>[]).map(transformMarketplaceItemForAdmin),
			pagination: {
				total,
				page,
				size,
				totalPages: Math.ceil(total / size),
			},
		});
	} catch (error) {
		next(error);
	}
}

// PATCH /api/admin/marketplace/:id/status
export async function setMarketplaceStatusByAdmin(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { id } = req.params as { id: string };
		const { status, reason } = req.body as AdminSetMarketplaceStatusInput;

		const existing = await MarketplaceItem.findById(id);
		if (!existing || existing.isDeleted) {
			throw new NotFoundError("Marketplace item");
		}

		const item = await MarketplaceItem.findByIdAndUpdate(
			id,
			{
				status,
				takedownReason: status === MarketplaceStatus.TAKEN_DOWN ? reason : null,
				isDeleted: status === MarketplaceStatus.REMOVED ? true : existing.isDeleted,
			},
			{ new: true },
		)
			.populate("sellerId", "firstName lastName phone email")
			.lean();

		await logAdminAction(req, "MARKETPLACE_STATUS_UPDATE", "SYSTEM", [id], {
			status,
			reason,
		});

		sendSuccess(
			res,
			{ item: transformMarketplaceItemForAdmin(item as Record<string, unknown>) },
			"Marketplace status updated",
		);
	} catch (error) {
		next(error);
	}
}

// PATCH /api/admin/users/bulk-status
export async function setUsersStatusBulk(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { userIds, isActive } = req.body as AdminBulkUserStatusInput;

		const objectIds = userIds.map((id) => new mongoose.Types.ObjectId(id));
		const result = await User.updateMany(
			{ _id: { $in: objectIds } },
			{ $set: { isActive } },
		);

		await logAdminAction(
			req,
			isActive ? "USER_BULK_ACTIVATE" : "USER_BULK_DEACTIVATE",
			"USER",
			userIds,
			{ modifiedCount: result.modifiedCount },
		);

		sendSuccess(res, {
			matchedCount: result.matchedCount,
			modifiedCount: result.modifiedCount,
		});
	} catch (error) {
		next(error);
	}
}

// PATCH /api/admin/payments/bulk/confirm
export async function confirmPaymentsBulk(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { paymentIds } = req.body as AdminBulkConfirmPaymentsInput;
		const objectIds = paymentIds.map((id) => new mongoose.Types.ObjectId(id));

		const pendingPayments = await Payment.find({
			_id: { $in: objectIds },
			status: PaymentStatus.PENDING,
		}).lean();

		const pendingIds = pendingPayments.map((payment) => payment._id);

		const result = await Payment.updateMany(
			{ _id: { $in: pendingIds } },
			{
				$set: {
					status: PaymentStatus.CONFIRMED,
					confirmedAt: new Date(),
					rejectionReason: null,
				},
			},
		);

		await Promise.all(
			pendingPayments.map((payment) =>
				recalcRentalPeriodStatus(payment.rentalPeriodId.toString()),
			),
		);

		await logAdminAction(req, "PAYMENT_BULK_CONFIRM", "PAYMENT", paymentIds, {
			modifiedCount: result.modifiedCount,
		});

		sendSuccess(res, {
			matchedCount: result.matchedCount,
			modifiedCount: result.modifiedCount,
		});
	} catch (error) {
		next(error);
	}
}

// PATCH /api/admin/payments/bulk/reject
export async function rejectPaymentsBulk(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { paymentIds, reason } = req.body as AdminBulkRejectPaymentsInput;
		const objectIds = paymentIds.map((id) => new mongoose.Types.ObjectId(id));

		const result = await Payment.updateMany(
			{ _id: { $in: objectIds }, status: PaymentStatus.PENDING },
			{
				$set: {
					status: PaymentStatus.REJECTED,
					rejectionReason: reason,
					confirmedAt: null,
				},
			},
		);

		await logAdminAction(req, "PAYMENT_BULK_REJECT", "PAYMENT", paymentIds, {
			reason,
			modifiedCount: result.modifiedCount,
		});

		sendSuccess(res, {
			matchedCount: result.matchedCount,
			modifiedCount: result.modifiedCount,
		});
	} catch (error) {
		next(error);
	}
}

// DELETE /api/admin/reviews/bulk
export async function deleteReviewsBulk(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { reviewIds } = req.body as AdminBulkDeleteReviewsInput;
		const objectIds = reviewIds.map((id) => new mongoose.Types.ObjectId(id));

		const result = await Review.deleteMany({ _id: { $in: objectIds } });

		await logAdminAction(req, "REVIEW_BULK_DELETE", "REVIEW", reviewIds, {
			deletedCount: result.deletedCount,
		});

		sendSuccess(res, {
			deletedCount: result.deletedCount,
		});
	} catch (error) {
		next(error);
	}
}

// GET /api/admin/actions
export async function listAdminActions(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { page, size, action, targetType } =
			req.query as unknown as AdminListActionsQuery;

		const filters: Record<string, unknown> = {
			...(action ? { action } : {}),
			...(targetType ? { targetType } : {}),
		};

		const [actions, total] = await Promise.all([
			AdminAction.find(filters)
				.populate("adminId", "firstName lastName email role")
				.sort({ createdAt: -1 })
				.skip((page - 1) * size)
				.limit(size)
				.lean(),
			AdminAction.countDocuments(filters),
		]);

		sendSuccess(res, {
			actions: (actions as Record<string, unknown>[]).map((entry) => ({
				...addId(entry),
				adminId:
					typeof entry.adminId === "object" && entry.adminId !== null
						? addId(entry.adminId as Record<string, unknown>)
						: entry.adminId,
			})),
			pagination: {
				total,
				page,
				size,
				totalPages: Math.ceil(total / size),
			},
		});
	} catch (error) {
		next(error);
	}
}
