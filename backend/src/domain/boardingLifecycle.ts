import { BoardingStatus, Role } from "@/types/enums.js";

export type LifecycleActor = Role | "SYSTEM";

export type BoardingAction =
	| "OWNER_UPDATE"
	| "OWNER_DELETE"
	| "OWNER_SUBMIT"
	| "OWNER_DEACTIVATE"
	| "OWNER_REACTIVATE"
	| "OWNER_ARCHIVE"
	| "OWNER_RESTORE"
	| "ADMIN_APPROVE"
	| "ADMIN_REJECT"
	| "ADMIN_REOPEN";

export const LIFECYCLE_SPEC_VERSION = "2026-04-20";

export const BOARDING_LIFECYCLE_POLICY = {
	activeEditPolicy: "AUTO_UNPUBLISH_AND_REVIEW",
	description:
		"Editing ACTIVE listings triggers transition to PENDING_APPROVAL and removes public visibility until re-approved.",
} as const;

export const BOARDING_VISIBILITY = {
	publicDiscovery: [BoardingStatus.ACTIVE],
	reservationEligible: [BoardingStatus.ACTIVE],
	moderationQueue: [BoardingStatus.PENDING_APPROVAL],
} as const;

export const BOARDING_TRANSITIONS: Record<
	BoardingAction,
	{
		allowedFrom: BoardingStatus[];
		toStatus?: BoardingStatus;
		actorRoles: LifecycleActor[];
	}
> = {
	OWNER_UPDATE: {
		allowedFrom: [
			BoardingStatus.DRAFT,
			BoardingStatus.REJECTED,
			BoardingStatus.INACTIVE,
			BoardingStatus.ACTIVE,
		],
		actorRoles: [Role.OWNER],
	},
	OWNER_DELETE: {
		allowedFrom: [BoardingStatus.DRAFT, BoardingStatus.PENDING_APPROVAL],
		actorRoles: [Role.OWNER],
	},
	OWNER_SUBMIT: {
		allowedFrom: [
			BoardingStatus.DRAFT,
			BoardingStatus.REJECTED,
			BoardingStatus.INACTIVE,
		],
		toStatus: BoardingStatus.PENDING_APPROVAL,
		actorRoles: [Role.OWNER],
	},
	OWNER_DEACTIVATE: {
		allowedFrom: [BoardingStatus.ACTIVE],
		toStatus: BoardingStatus.INACTIVE,
		actorRoles: [Role.OWNER],
	},
	OWNER_REACTIVATE: {
		allowedFrom: [BoardingStatus.INACTIVE],
		toStatus: BoardingStatus.ACTIVE,
		actorRoles: [Role.OWNER],
	},
	OWNER_ARCHIVE: {
		allowedFrom: [
			BoardingStatus.DRAFT,
			BoardingStatus.REJECTED,
			BoardingStatus.INACTIVE,
			BoardingStatus.ACTIVE,
		],
		actorRoles: [Role.OWNER],
	},
	OWNER_RESTORE: {
		allowedFrom: [
			BoardingStatus.DRAFT,
			BoardingStatus.REJECTED,
			BoardingStatus.INACTIVE,
			BoardingStatus.ACTIVE,
			BoardingStatus.PENDING_APPROVAL,
		],
		actorRoles: [Role.OWNER],
	},
	ADMIN_APPROVE: {
		allowedFrom: [BoardingStatus.PENDING_APPROVAL],
		toStatus: BoardingStatus.ACTIVE,
		actorRoles: [Role.ADMIN],
	},
	ADMIN_REJECT: {
		allowedFrom: [BoardingStatus.PENDING_APPROVAL],
		toStatus: BoardingStatus.REJECTED,
		actorRoles: [Role.ADMIN],
	},
	ADMIN_REOPEN: {
		allowedFrom: [BoardingStatus.REJECTED],
		toStatus: BoardingStatus.DRAFT,
		actorRoles: [Role.ADMIN],
	},
};

export function canTransition(
	action: BoardingAction,
	fromStatus: BoardingStatus,
	actorRole: LifecycleActor,
): boolean {
	const transition = BOARDING_TRANSITIONS[action];
	return (
		transition.actorRoles.includes(actorRole) &&
		transition.allowedFrom.includes(fromStatus)
	);
}
