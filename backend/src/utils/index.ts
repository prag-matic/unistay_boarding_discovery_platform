/**
 * Sanitize user object by removing sensitive fields
 * @param user - User object
 * @returns User object without sensitive data
 */
export const sanitizeUser = <T extends Record<string, unknown>>(
	user: T,
): Omit<T, "password"> => {
	const { password, ...sanitized } = user as T & { password?: string };
	return sanitized;
};

// ─── Lean-document response transform helpers ─────────────────────────────────
//
// Mongoose `.lean()` returns raw MongoDB documents where the document ID is
// stored as `_id` (ObjectId).  All frontend types expect a string `id` field.
// The helpers below normalise lean results before they are sent as API
// responses so that:
//   • every document exposes `id: string`
//   • populated foreign-key fields are renamed to the property the frontend
//     expects (e.g. `ownerId` populated object → `owner` + `ownerId: string`)

type LeanDoc = Record<string, unknown>;

function objectIdToString(value: unknown): string {
	if (value == null) return "";
	if (typeof value === "string") return value;
	if (typeof (value as { toString(): string }).toString === "function") {
		return (value as { toString(): string }).toString();
	}
	return String(value);
}

function isPopulatedRef(value: unknown): value is LeanDoc {
	return (
		value != null && typeof value === "object" && (value as LeanDoc)._id != null
	);
}

/** Add a string `id` field derived from the document's `_id`. */
export function addId<T extends LeanDoc>(doc: T): T & { id: string } {
	return { ...doc, id: objectIdToString(doc._id) };
}

/**
 * Transform a Boarding lean document:
 * - `_id` → `id`
 * - populated `ownerId` → `owner: { id, … }` + `ownerId: string`
 * - nested images / amenities / rules arrays: `_id` → `id`
 */
export function transformBoardingDoc(doc: LeanDoc): LeanDoc {
	const ownerRef = doc.ownerId as LeanDoc | null | undefined;
	const ownerPopulated = isPopulatedRef(ownerRef);

	const owner = ownerPopulated ? addId(ownerRef as LeanDoc) : undefined;
	const ownerId = ownerPopulated
		? objectIdToString((ownerRef as LeanDoc)._id)
		: objectIdToString(doc.ownerId);

	const images = Array.isArray(doc.images)
		? (doc.images as LeanDoc[]).map(addId)
		: doc.images;
	const amenities = Array.isArray(doc.amenities)
		? (doc.amenities as LeanDoc[]).map(addId)
		: doc.amenities;
	const rules = Array.isArray(doc.rules)
		? (doc.rules as LeanDoc[]).map(addId)
		: doc.rules;

	return {
		...addId(doc),
		ownerId,
		...(owner !== undefined && { owner }),
		...(images !== undefined && { images }),
		...(amenities !== undefined && { amenities }),
		...(rules !== undefined && { rules }),
	};
}

/**
 * Transform a Reservation lean document:
 * - `_id` → `id`
 * - populated `boardingId` → `boarding: { id, … }` + `boardingId: string`
 * - populated `studentId`  → `student: { id, … }` + `studentId: string`
 */
export function transformReservationDoc(doc: LeanDoc): LeanDoc {
	const boardingRef = doc.boardingId as LeanDoc | null | undefined;
	const studentRef = doc.studentId as LeanDoc | null | undefined;

	const boardingPopulated = isPopulatedRef(boardingRef);
	const studentPopulated = isPopulatedRef(studentRef);

	const boarding = boardingPopulated
		? addId(boardingRef as LeanDoc)
		: undefined;
	const student = studentPopulated ? addId(studentRef as LeanDoc) : undefined;

	const boardingId = boardingPopulated
		? objectIdToString((boardingRef as LeanDoc)._id)
		: objectIdToString(doc.boardingId);
	const studentId = studentPopulated
		? objectIdToString((studentRef as LeanDoc)._id)
		: objectIdToString(doc.studentId);

	return {
		...addId(doc),
		boardingId,
		studentId,
		...(boarding !== undefined && { boarding }),
		...(student !== undefined && { student }),
	};
}

/** Same shape as Reservation – alias for clarity. */
export const transformVisitRequestDoc = transformReservationDoc;

/**
 * Transform a RentalPeriod lean document:
 * - `_id` → `id`
 * - nested payments array: `_id` → `id`
 */
export function transformRentalPeriodDoc(doc: LeanDoc): LeanDoc {
	const payments = Array.isArray(doc.payments)
		? (doc.payments as LeanDoc[]).map(addId)
		: doc.payments;

	return {
		...addId(doc),
		...(payments !== undefined && { payments }),
	};
}

/**
 * Transform a SavedBoarding lean document:
 * - `_id` → `id`
 * - populated `boardingId` (full Boarding) → `boarding: transformBoardingDoc(…)` + `boardingId: string`
 */
export function transformSavedBoardingDoc(doc: LeanDoc): LeanDoc {
	const boardingRef = doc.boardingId as LeanDoc | null | undefined;
	const boardingPopulated = isPopulatedRef(boardingRef);

	const boarding = boardingPopulated
		? transformBoardingDoc(boardingRef as LeanDoc)
		: undefined;
	const boardingId = boardingPopulated
		? objectIdToString((boardingRef as LeanDoc)._id)
		: objectIdToString(doc.boardingId);

	return {
		...addId(doc),
		boardingId,
		...(boarding !== undefined && { boarding }),
	};
}

/**
 * Transform a Payment lean document:
 * - `_id` → `id`
 * - populated `studentId` → `student: { id, … }` + `studentId: string`
 * - populated `reservationId` → `reservation: { id, boarding?: { id, … } }` + `reservationId: string`
 * - populated `rentalPeriodId` → `rentalPeriod: { id, … }` + `rentalPeriodId: string`
 */
export function transformPaymentDoc(doc: LeanDoc): LeanDoc {
    const studentRef = doc.studentId as LeanDoc | null | undefined;
	const reservationRef = doc.reservationId as LeanDoc | null | undefined;
	const rentalPeriodRef = doc.rentalPeriodId as LeanDoc | null | undefined;

	const studentPopulated = isPopulatedRef(studentRef);
	const reservationPopulated = isPopulatedRef(reservationRef);
	const rentalPeriodPopulated = isPopulatedRef(rentalPeriodRef);

	const student = studentPopulated ? addId(studentRef as LeanDoc) : undefined;
	let reservation: LeanDoc | undefined;
	if (reservationPopulated) {
		const boardingRef = (reservationRef as LeanDoc).boardingId as
			| LeanDoc
			| null
			| undefined;
		const boardingPopulated = isPopulatedRef(boardingRef);
		const boarding = boardingPopulated
			? addId(boardingRef as LeanDoc)
			: undefined;
		const boardingId = boardingPopulated
			? objectIdToString((boardingRef as LeanDoc)._id)
			: objectIdToString((reservationRef as LeanDoc).boardingId);

		reservation = {
			...addId(reservationRef as LeanDoc),
			boardingId,
			...(boarding !== undefined && { boarding }),
		};
	}

	const rentalPeriod = rentalPeriodPopulated
		? addId(rentalPeriodRef as LeanDoc)
		: undefined;

	const reservationId = reservationPopulated
		? objectIdToString((reservationRef as LeanDoc)._id)
		: objectIdToString(doc.reservationId);
	const rentalPeriodId = rentalPeriodPopulated
		? objectIdToString((rentalPeriodRef as LeanDoc)._id)
		: objectIdToString(doc.rentalPeriodId);
	const studentId = studentPopulated
		? objectIdToString((studentRef as LeanDoc)._id)
		: objectIdToString(doc.studentId);

	return {
		...addId(doc),
		studentId,
		reservationId,
		rentalPeriodId,
		...(student !== undefined && { student }),
		...(reservation !== undefined && { reservation }),
		...(rentalPeriod !== undefined && { rentalPeriod }),
	};
}

/**
 * Generate a random string (for tokens, IDs, etc.)
 * @param length - Length of the string
 * @returns Random string
 */
export const generateRandomString = (length: number = 32): string => {
	const chars =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let result = "";
	for (let i = 0; i < length; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
};

/**
 * Validate email format
 * @param email - Email to validate
 * @returns True if valid email
 */
export const isValidEmail = (email: string): boolean => {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
};

/**
 * Validate phone number format (basic validation)
 * @param phone - Phone number to validate
 * @returns True if valid phone
 */
export const isValidPhone = (phone: string): boolean => {
	const phoneRegex = /^\+?[\d\s-()]{10,}$/;
	return phoneRegex.test(phone);
};

/**
 * Format date to ISO string
 * @param date - Date to format
 * @returns ISO formatted date string
 */
export const formatDate = (date: Date): string => {
	return date.toISOString();
};

/**
 * Calculate pagination metadata
 * @param page - Current page
 * @param limit - Items per page
 * @param total - Total items
 * @returns Pagination object
 */
export const calculatePagination = (
	page: number = 1,
	limit: number = 10,
	total: number,
) => {
	const totalPages = Math.ceil(total / limit);
	return {
		page,
		limit,
		total,
		totalPages,
	};
};

/**
 * Sleep for a specified duration
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after the delay
 */
export const sleep = (ms: number): Promise<void> => {
	return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Check if a date is in the past
 * @param date - Date to check
 * @returns True if date is in the past
 */
export const isPastDate = (date: Date): boolean => {
	return date.getTime() < Date.now();
};

/**
 * Check if a date is in the future
 * @param date - Date to check
 * @returns True if date is in the future
 */
export const isFutureDate = (date: Date): boolean => {
	return date.getTime() > Date.now();
};
