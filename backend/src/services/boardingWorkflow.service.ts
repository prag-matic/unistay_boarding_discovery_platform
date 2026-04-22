import mongoose, { type ClientSession } from "mongoose";
import {
	BoardingNotFoundError,
	ConflictError,
	ForbiddenError,
	InvalidStateTransitionError,
	ValidationError,
} from "@/errors/AppError.js";
import { withMongoTransaction } from "@/lib/mongodb.js";
import {
	Boarding,
	BoardingAmenity,
	BoardingImage,
	BoardingRule,
	BoardingStatusHistory,
	Issue,
	Payment,
	RentalPeriod,
	Reservation,
	Review,
	SavedBoarding,
	VisitRequest,
	ChatRoom,
	type IBoarding,
} from "@/models/index.js";
import type { UpdateBoardingInput } from "@/schemas/boarding.validators.js";
import { BoardingStatus, Role } from "@/types/enums.js";
import {
	BOARDING_LIFECYCLE_POLICY,
	canTransition,
	type BoardingAction,
	type LifecycleActor,
} from "@/domain/boardingLifecycle.js";
import { generateUniqueSlug } from "@/utils/slug.js";

type LeanBoarding = IBoarding & { __v?: number };

interface TransitionInput {
	boardingId: string;
	action: BoardingAction;
	actorId?: string;
	actorRole: LifecycleActor;
	reason?: string;
	note?: string;
	expectedOwnerId?: string;
	updates?: Record<string, unknown>;
	session?: ClientSession;
}

export class BoardingWorkflowService {
	private getSessionOptions(session?: ClientSession): { session: ClientSession } {
		if (!session) {
			throw new ValidationError("Missing required database session");
		}
		return { session };
	}

	private async insertRules(
		boardingId: string,
		rules: string[],
		session?: ClientSession,
	): Promise<void> {
		if (rules.length === 0) return;
		const docs = rules.map((rule) => ({ boardingId, rule }));
		if (session) {
			await BoardingRule.insertMany(docs, this.getSessionOptions(session));
			return;
		}
		await BoardingRule.insertMany(docs);
	}

	private async insertAmenities(
		boardingId: string,
		amenities: string[],
		session?: ClientSession,
	): Promise<void> {
		if (amenities.length === 0) return;
		const docs = amenities.map((name) => ({ boardingId, name }));
		if (session) {
			await BoardingAmenity.insertMany(docs, this.getSessionOptions(session));
			return;
		}
		await BoardingAmenity.insertMany(docs);
	}

	private async getBoardingOrThrow(
		boardingId: string,
		session?: ClientSession,
	): Promise<LeanBoarding> {
		const query = Boarding.findById(boardingId);
		if (session) query.session(session);
		const boarding = (await query) as LeanBoarding | null;
		if (!boarding || boarding.isDeleted) throw new BoardingNotFoundError();
		return boarding;
	}

	private async recordHistory(
		params: {
			boardingId: string;
			fromStatus: BoardingStatus;
			toStatus: BoardingStatus;
			action: BoardingAction;
			actorRole: LifecycleActor;
			actorId?: string;
			reason?: string;
			note?: string;
			session?: ClientSession;
		},
	): Promise<void> {
		const payload = {
			boardingId: new mongoose.Types.ObjectId(params.boardingId),
			fromStatus: params.fromStatus,
			toStatus: params.toStatus,
			action: params.action,
			actorRole: params.actorRole,
			...(params.actorId && {
				actorId: new mongoose.Types.ObjectId(params.actorId),
			}),
			...(params.reason && { reason: params.reason }),
			...(params.note && { note: params.note }),
		};
		if (params.session) {
			await BoardingStatusHistory.create([payload], { session: params.session });
			return;
		}
		await BoardingStatusHistory.create(payload);
	}

	private async executeTransition(input: TransitionInput): Promise<IBoarding> {
		const existing = await this.getBoardingOrThrow(input.boardingId, input.session);

		if (input.expectedOwnerId && existing.ownerId.toString() !== input.expectedOwnerId) {
			throw new ForbiddenError("You do not own this listing");
		}

		if (!canTransition(input.action, existing.status, input.actorRole)) {
			throw new InvalidStateTransitionError(
				`Action ${input.action} is not allowed from ${existing.status}`,
			);
		}

		const shouldMoveActiveEditToReview =
			input.action === "OWNER_UPDATE" &&
			existing.status === BoardingStatus.ACTIVE &&
			BOARDING_LIFECYCLE_POLICY.activeEditPolicy === "AUTO_UNPUBLISH_AND_REVIEW";

		const status = shouldMoveActiveEditToReview
			? BoardingStatus.PENDING_APPROVAL
			: input.action === "OWNER_UPDATE"
				? existing.status
				: this.targetStatusForAction(input.action);

		const moderationFields =
			input.actorRole === Role.ADMIN
				? {
						lastModeratedAt: new Date(),
						...(input.actorId && {
							lastModeratedBy: new mongoose.Types.ObjectId(input.actorId),
						}),
						...(input.note && { lastModerationNote: input.note }),
					}
				: {};

		const setUpdates: Record<string, unknown> = {
			...input.updates,
			status,
			...moderationFields,
		};

		if (status === BoardingStatus.ACTIVE || status === BoardingStatus.PENDING_APPROVAL) {
			setUpdates.rejectionReason = null;
		}

		let pushUpdates: Record<string, unknown> | undefined;
		if (input.action === "ADMIN_REJECT") {
			setUpdates.rejectionReason = input.reason;
			pushUpdates = {
				rejectionHistory: {
					reason: input.reason,
					rejectedAt: new Date(),
					...(input.note && { note: input.note }),
					...(input.actorId && {
						rejectedBy: new mongoose.Types.ObjectId(input.actorId),
					}),
				},
			};
		}

		const version = existing.__v ?? 0;
		const query = Boarding.findOneAndUpdate(
			{ _id: input.boardingId, __v: version },
			{
				$set: setUpdates,
				...(pushUpdates && { $push: pushUpdates }),
				$inc: { __v: 1 },
			},
			{ new: true },
		);
		if (input.session) query.session(input.session);
		const updated = await query;
		if (!updated) {
			throw new ConflictError(
				"Boarding was modified by another request. Please retry.",
			);
		}

		if (existing.status !== status) {
			await this.recordHistory({
				boardingId: input.boardingId,
				fromStatus: existing.status,
				toStatus: status,
				action: input.action,
				actorId: input.actorId,
				actorRole: input.actorRole,
				reason: input.reason,
				note: input.note,
				session: input.session,
			});
		}

		return updated;
	}

	private targetStatusForAction(action: BoardingAction): BoardingStatus {
		switch (action) {
			case "OWNER_SUBMIT":
				return BoardingStatus.PENDING_APPROVAL;
			case "OWNER_DEACTIVATE":
				return BoardingStatus.INACTIVE;
			case "OWNER_REACTIVATE":
				return BoardingStatus.ACTIVE;
			case "ADMIN_APPROVE":
				return BoardingStatus.ACTIVE;
			case "ADMIN_REJECT":
				return BoardingStatus.REJECTED;
			case "ADMIN_REOPEN":
				return BoardingStatus.DRAFT;
			case "OWNER_UPDATE":
			case "OWNER_ARCHIVE":
			case "OWNER_RESTORE":
				throw new InvalidStateTransitionError(
					`Action ${action} does not have a fixed target status`,
				);
		}

		throw new InvalidStateTransitionError(`Unsupported action: ${action}`);
	}

	async updateBoarding(
		boardingId: string,
		ownerId: string,
		body: UpdateBoardingInput,
	): Promise<void> {
		await withMongoTransaction(async (session) => {
			const existing = await this.getBoardingOrThrow(boardingId, session);
			if (existing.ownerId.toString() !== ownerId) {
				throw new ForbiddenError("You do not own this listing");
			}
			if (existing.status === BoardingStatus.PENDING_APPROVAL) {
				throw new InvalidStateTransitionError(
					"Cannot edit a listing while it is pending approval",
				);
			}

			const maxOccupants = body.maxOccupants ?? existing.maxOccupants;
			const currentOccupants = body.currentOccupants ?? existing.currentOccupants;
			if (currentOccupants > maxOccupants) {
				throw new ValidationError("currentOccupants cannot exceed maxOccupants");
			}

			const { rules, amenities, title, ...rest } = body;
			let slug = existing.slug;
			if (title && title !== existing.title) {
				slug = await generateUniqueSlug(title, boardingId);
			}

			if (rules !== undefined) {
				if (session) {
					await BoardingRule.deleteMany(
						{ boardingId },
						this.getSessionOptions(session),
					);
				} else {
					await BoardingRule.deleteMany({ boardingId });
				}
			}
			if (amenities !== undefined) {
				if (session) {
					await BoardingAmenity.deleteMany(
						{ boardingId },
						this.getSessionOptions(session),
					);
				} else {
					await BoardingAmenity.deleteMany({ boardingId });
				}
			}

			await this.executeTransition({
				boardingId,
				action: "OWNER_UPDATE",
				actorId: ownerId,
				actorRole: Role.OWNER,
				expectedOwnerId: ownerId,
				updates: {
					...rest,
					...(title && { title }),
					slug,
				},
				session,
			});

			await this.insertRules(boardingId, rules ?? [], session);
			await this.insertAmenities(boardingId, amenities ?? [], session);
		});
	}

	async submitForReview(boardingId: string, ownerId: string): Promise<void> {
		const existing = await this.getBoardingOrThrow(boardingId);
		if (existing.ownerId.toString() !== ownerId) {
			throw new ForbiddenError("You do not own this listing");
		}
		const imageCount = await BoardingImage.countDocuments({ boardingId });
		if (imageCount < 1) {
			throw new ValidationError(
				"At least 1 image is required to submit for approval",
			);
		}

		await this.executeTransition({
			boardingId,
			action: "OWNER_SUBMIT",
			actorId: ownerId,
			actorRole: Role.OWNER,
			expectedOwnerId: ownerId,
		});
	}

	async hardDeleteDraft(boardingId: string, ownerId: string): Promise<string[]> {
		return withMongoTransaction(async (session) => {
			const deleteManyWithOptionalSession = (
				model: {
					deleteMany: (
						filter: Record<string, unknown>,
						options?: { session: ClientSession },
					) => Promise<unknown>;
				},
				filter: Record<string, unknown>,
			) => {
				if (session) {
					return model.deleteMany(filter, { session });
				}
				return model.deleteMany(filter);
			};

			const existing = await this.getBoardingOrThrow(boardingId, session);
			if (existing.ownerId.toString() !== ownerId) {
				throw new ForbiddenError("You do not own this listing");
			}
			if (
				existing.status !== BoardingStatus.DRAFT &&
				existing.status !== BoardingStatus.PENDING_APPROVAL
			) {
				throw new InvalidStateTransitionError(
					"Only DRAFT and PENDING_APPROVAL listings can be permanently deleted",
				);
			}

			const imagesQuery = BoardingImage.find({ boardingId })
				.select("publicId")
				.lean();
			if (session) imagesQuery.session(session);
			const images = (await imagesQuery) as Array<{ publicId: string }>;
			const publicIds = images.map((image) => image.publicId);

			const reservationsQuery = Reservation.find({ boardingId })
				.select("_id")
				.lean();
			if (session) reservationsQuery.session(session);
			const reservations = (await reservationsQuery) as Array<{
				_id: mongoose.Types.ObjectId;
			}>;
			const reservationIds = reservations.map((reservation) => reservation._id);

			await deleteManyWithOptionalSession(SavedBoarding, { boardingId });
			await deleteManyWithOptionalSession(Review, { boardingId });
			await deleteManyWithOptionalSession(VisitRequest, { boardingId });
			await deleteManyWithOptionalSession(Issue, { boardingId });
			await deleteManyWithOptionalSession(ChatRoom, { boardingId });

			if (reservationIds.length > 0) {
				await deleteManyWithOptionalSession(Payment, {
					reservationId: { $in: reservationIds },
				});
				await deleteManyWithOptionalSession(RentalPeriod, {
					reservationId: { $in: reservationIds },
				});
			}
			await deleteManyWithOptionalSession(Reservation, { boardingId });

			await deleteManyWithOptionalSession(BoardingAmenity, { boardingId });
			await deleteManyWithOptionalSession(BoardingRule, { boardingId });
			await deleteManyWithOptionalSession(BoardingStatusHistory, { boardingId });
			await deleteManyWithOptionalSession(BoardingImage, { boardingId });

			const version = existing.__v ?? 0;
			const deleteBoardingQuery = Boarding.findOneAndDelete({
				_id: boardingId,
				__v: version,
			});
			if (session) deleteBoardingQuery.session(session);
			const deleted = await deleteBoardingQuery;
			if (!deleted) {
				throw new ConflictError(
					"Boarding was modified by another request. Please retry.",
				);
			}

			return publicIds;
		});
	}

	async deactivate(boardingId: string, ownerId: string): Promise<void> {
		await this.executeTransition({
			boardingId,
			action: "OWNER_DEACTIVATE",
			actorId: ownerId,
			actorRole: Role.OWNER,
			expectedOwnerId: ownerId,
		});
	}

	async reactivate(boardingId: string, ownerId: string): Promise<void> {
		await this.executeTransition({
			boardingId,
			action: "OWNER_REACTIVATE",
			actorId: ownerId,
			actorRole: Role.OWNER,
			expectedOwnerId: ownerId,
		});
	}

	async archive(boardingId: string, ownerId: string): Promise<void> {
		const existing = await this.getBoardingOrThrow(boardingId);
		if (existing.ownerId.toString() !== ownerId) {
			throw new ForbiddenError("You do not own this listing");
		}
		if (!canTransition("OWNER_ARCHIVE", existing.status, Role.OWNER)) {
			throw new InvalidStateTransitionError("Cannot archive listing in this state");
		}

		const version = existing.__v ?? 0;
		const updated = await Boarding.findOneAndUpdate(
			{ _id: boardingId, __v: version },
			{
				$set: {
					isDeleted: true,
					archivedAt: new Date(),
					archivedBy: new mongoose.Types.ObjectId(ownerId),
				},
				$inc: { __v: 1 },
			},
			{ new: true },
		);
		if (!updated) {
			throw new ConflictError(
				"Boarding was modified by another request. Please retry.",
			);
		}
	}

	async restore(boardingId: string, ownerId: string): Promise<void> {
		const existing = (await Boarding.findById(boardingId)) as LeanBoarding | null;
		if (!existing) throw new BoardingNotFoundError();
		if (existing.ownerId.toString() !== ownerId) {
			throw new ForbiddenError("You do not own this listing");
		}
		if (!existing.isDeleted) {
			throw new InvalidStateTransitionError("Listing is not archived");
		}
		if (!canTransition("OWNER_RESTORE", existing.status, Role.OWNER)) {
			throw new InvalidStateTransitionError("Cannot restore listing in this state");
		}

		const version = existing.__v ?? 0;
		const updated = await Boarding.findOneAndUpdate(
			{ _id: boardingId, __v: version },
			{
				$set: {
					isDeleted: false,
					archivedAt: null,
					archivedBy: null,
				},
				$inc: { __v: 1 },
			},
			{ new: true },
		);
		if (!updated) {
			throw new ConflictError(
				"Boarding was modified by another request. Please retry.",
			);
		}
	}

	async approve(
		boardingId: string,
		adminId: string,
		note?: string,
	): Promise<void> {
		await this.executeTransition({
			boardingId,
			action: "ADMIN_APPROVE",
			actorId: adminId,
			actorRole: Role.ADMIN,
			note,
		});
	}

	async reject(
		boardingId: string,
		adminId: string,
		reason: string,
		note?: string,
	): Promise<void> {
		if (!reason?.trim()) {
			throw new ValidationError("Rejection reason is required");
		}
		await this.executeTransition({
			boardingId,
			action: "ADMIN_REJECT",
			actorId: adminId,
			actorRole: Role.ADMIN,
			reason,
			note,
		});
	}

	async reopen(
		boardingId: string,
		adminId: string,
		note?: string,
	): Promise<void> {
		await this.executeTransition({
			boardingId,
			action: "ADMIN_REOPEN",
			actorId: adminId,
			actorRole: Role.ADMIN,
			note,
		});
	}

	async getHistory(
		boardingId: string,
		viewerId: string,
		viewerRole: Role,
		limit = 20,
	): Promise<unknown[]> {
		const boarding = (await Boarding.findById(boardingId).select("ownerId isDeleted")) as
			| LeanBoarding
			| null;
		if (!boarding || boarding.isDeleted) throw new BoardingNotFoundError();
		if (viewerRole !== Role.ADMIN && boarding.ownerId.toString() !== viewerId) {
			throw new ForbiddenError("You do not have access to this listing history");
		}

		return BoardingStatusHistory.find({ boardingId })
			.sort({ createdAt: -1 })
			.limit(Math.max(1, Math.min(limit, 100)))
			.lean();
	}
}

export const boardingWorkflowService = new BoardingWorkflowService();
