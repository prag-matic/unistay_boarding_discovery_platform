export enum Role {
	STUDENT = "STUDENT",
	OWNER = "OWNER",
	ADMIN = "ADMIN",
}

export enum BoardingType {
	SINGLE_ROOM = "SINGLE_ROOM",
	SHARED_ROOM = "SHARED_ROOM",
	ANNEX = "ANNEX",
	HOUSE = "HOUSE",
}

export enum GenderPref {
	MALE = "MALE",
	FEMALE = "FEMALE",
	ANY = "ANY",
}

export enum BoardingStatus {
	DRAFT = "DRAFT",
	PENDING_APPROVAL = "PENDING_APPROVAL",
	ACTIVE = "ACTIVE",
	REJECTED = "REJECTED",
	INACTIVE = "INACTIVE",
}

export enum BoardingAmenityType {
	WIFI = "WIFI",
	AIR_CONDITIONING = "AIR_CONDITIONING",
	HOT_WATER = "HOT_WATER",
	LAUNDRY = "LAUNDRY",
	PARKING = "PARKING",
	SECURITY = "SECURITY",
	KITCHEN = "KITCHEN",
	GYM = "GYM",
	SWIMMING_POOL = "SWIMMING_POOL",
	STUDY_ROOM = "STUDY_ROOM",
	COMMON_AREA = "COMMON_AREA",
	BALCONY = "BALCONY",
	GENERATOR = "GENERATOR",
	WATER_TANK = "WATER_TANK",
}

export enum ReservationStatus {
	PENDING = "PENDING",
	ACTIVE = "ACTIVE",
	COMPLETED = "COMPLETED",
	CANCELLED = "CANCELLED",
	REJECTED = "REJECTED",
	EXPIRED = "EXPIRED",
}

export enum RentalPeriodStatus {
	UPCOMING = "UPCOMING",
	DUE = "DUE",
	PARTIALLY_PAID = "PARTIALLY_PAID",
	PAID = "PAID",
	OVERDUE = "OVERDUE",
}

export enum PaymentMethod {
	CASH = "CASH",
	BANK_TRANSFER = "BANK_TRANSFER",
	ONLINE = "ONLINE",
}

export enum PaymentStatus {
	PENDING = "PENDING",
	CONFIRMED = "CONFIRMED",
	REJECTED = "REJECTED",
}

export enum VisitRequestStatus {
	PENDING = "PENDING",
	APPROVED = "APPROVED",
	REJECTED = "REJECTED",
	CANCELLED = "CANCELLED",
	EXPIRED = "EXPIRED",
}

export enum ReactionType {
	LIKE = "LIKE",
	DISLIKE = "DISLIKE",
}

export enum MarketplaceAdType {
	SELL = "SELL",
	GIVEAWAY = "GIVEAWAY",
}

export enum MarketplaceCondition {
	NEW = "NEW",
	LIKE_NEW = "LIKE_NEW",
	GOOD = "GOOD",
	FAIR = "FAIR",
	POOR = "POOR",
}

export enum MarketplaceStatus {
	ACTIVE = "ACTIVE",
	TAKEN_DOWN = "TAKEN_DOWN",
	REMOVED = "REMOVED",
}

export enum MarketplaceReportReason {
	SPAM = "SPAM",
	SCAM = "SCAM",
	PROHIBITED_ITEM = "PROHIBITED_ITEM",
	HARASSMENT = "HARASSMENT",
	OTHER = "OTHER",
}

export enum MarketplaceReportStatus {
	OPEN = "OPEN",
	RESOLVED = "RESOLVED",
	DISMISSED = "DISMISSED",
}
