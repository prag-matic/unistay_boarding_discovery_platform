import { vi } from "vitest";

function makeObjectId(value = "507f1f77bcf86cd799439011") {
	return {
		toString: () => value,
	};
}

function makeDoc(overrides: Record<string, unknown> = {}) {
	const now = new Date();
	const base = {
		_id: makeObjectId(),
		id: "507f1f77bcf86cd799439011",
		email: "test@example.com",
		passwordHash: "password-hash",
		firstName: "Test",
		lastName: "User",
		role: "STUDENT",
		isVerified: true,
		isActive: true,
		phone: "0771234567",
		university: "SLIIT",
		nicNumber: "123456789V",
		profileImageUrl: null,
		ownerId: makeObjectId(),
		status: "ACTIVE",
		slug: "sample-boarding",
		title: "Sample",
		city: "Malabe",
		district: "Colombo",
		monthlyRent: 15000,
		currentOccupants: 1,
		maxOccupants: 2,
		amount: 1000,
		amountDue: 1000,
		revokedAt: null,
		expiresAt: new Date(Date.now() + 1000 * 60 * 60),
		createdAt: now,
		updatedAt: now,
		toObject() {
			return { ...this, ...overrides };
		},
	};

	return { ...base, ...overrides };
}

function makeQueryResult<T>(resolvedValue: T) {
	const chain: Record<string, unknown> = {};
	const passthrough = () => chain;

	for (const method of [
		"populate",
		"select",
		"skip",
		"limit",
		"sort",
		"lean",
		"session",
		"where",
		"lt",
		"gt",
	]) {
		chain[method] = vi.fn(passthrough);
	}

	chain.distinct = vi.fn(async () => resolvedValue);
	chain.exec = vi.fn(async () => resolvedValue);
	chain.then = (onFulfilled: (value: T) => unknown) =>
		Promise.resolve(resolvedValue).then(onFulfilled);

	return chain;
}

function makeModel() {
	return {
		find: vi.fn(() => makeQueryResult([makeDoc()])),
		findOne: vi.fn(() => makeQueryResult(makeDoc())),
		findById: vi.fn(() => makeQueryResult(makeDoc())),
		findByIdAndUpdate: vi.fn(() => makeQueryResult(makeDoc())),
		findOneAndUpdate: vi.fn(() => makeQueryResult(makeDoc())),
		findByIdAndDelete: vi.fn(() => makeQueryResult(makeDoc())),
		findOneAndDelete: vi.fn(() => makeQueryResult(makeDoc())),
		countDocuments: vi.fn(async () => 1),
		aggregate: vi.fn(async () => []),
		distinct: vi.fn(async () => []),
		insertMany: vi.fn(async () => []),
		create: vi.fn(async (input: unknown) => {
			if (Array.isArray(input)) {
				return [{ _id: makeObjectId() }];
			}
			return makeDoc(input as Record<string, unknown>);
		}),
		updateMany: vi.fn(async () => ({ acknowledged: true, modifiedCount: 1 })),
		deleteMany: vi.fn(async () => ({ acknowledged: true, deletedCount: 1 })),
		deleteOne: vi.fn(async () => ({ acknowledged: true, deletedCount: 1 })),
	};
}

const modelNames = [
	"AdminAction",
	"Boarding",
	"BoardingAmenity",
	"BoardingImage",
	"BoardingRule",
	"EmailVerificationToken",
	"Issue",
	"MarketplaceItem",
	"MarketplaceReport",
	"Message",
	"Payment",
	"PasswordResetToken",
	"RefreshToken",
	"RentalPeriod",
	"Reservation",
	"Review",
	"ReviewComment",
	"ReviewReaction",
	"ReviewCommentReaction",
	"SavedBoarding",
	"User",
	"VisitRequest",
];

vi.mock("mongoose", async (importOriginal) => {
	const actual = (await importOriginal()) as Record<string, unknown>;
	function ObjectId(this: unknown, value?: string) {
		return makeObjectId(value);
	}
	const objectId = Object.assign(ObjectId, {
		isValid: () => true,
	});

	return {
		...actual,
		default: {
			...(actual.default as Record<string, unknown>),
			Types: {
				...((actual.default as { Types?: Record<string, unknown> })?.Types ?? {}),
				ObjectId: objectId,
			},
		},
		Types: {
			...(actual.Types as Record<string, unknown>),
			ObjectId: objectId,
		},
	};
});

vi.mock("@/models/index.js", () => {
	const exports: Record<string, unknown> = {};
	for (const name of modelNames) {
		exports[name] = makeModel();
	}
	return exports;
});

vi.mock("@/models/ChatMessage.js", () => ({
	ChatMessage: makeModel(),
}));

vi.mock("@/models/ChatRoom.js", () => ({
	ChatRoom: makeModel(),
}));

vi.mock("@/models/User.js", () => ({
	User: makeModel(),
}));

vi.mock("@/models/Issue.js", () => ({
	Issue: makeModel(),
}));

vi.mock("@/lib/response.js", () => ({
	sendSuccess: vi.fn(
		(
			res: { status?: (code: number) => unknown; json?: (body: unknown) => unknown },
			data?: unknown,
			message?: string,
			statusCode = 200,
		) => {
			if (res.status) res.status(statusCode);
			if (res.json) {
				res.json({ success: true, data, message });
			}
		},
	),
}));

vi.mock("@/lib/email.js", () => ({
	sendVerificationEmail: vi.fn(async () => undefined),
	sendPasswordResetEmail: vi.fn(async () => undefined),
}));

vi.mock("@/lib/hash.js", () => ({
	generateSecureToken: vi.fn(() => "secure-token"),
	sha256: vi.fn((value: string) => `sha-${value}`),
}));

vi.mock("@/lib/jwt.js", () => ({
	parseDurationMs: vi.fn(() => 1000 * 60 * 60),
	signAccessToken: vi.fn(() => "access-token"),
	verifyAccessToken: vi.fn(() => ({ userId: "507f1f77bcf86cd799439011", role: "STUDENT" })),
}));

vi.mock("@/lib/mongodb.js", () => ({
	withMongoTransaction: vi.fn(async (handler: (session: unknown) => Promise<unknown>) =>
		handler(undefined),
	),
}));

vi.mock("@/lib/cloudinary.js", () => ({
	uploadBoardingImage: vi.fn(async () => ({ url: "https://example.com/image.jpg", publicId: "public-id" })),
	deleteBoardingImage: vi.fn(async () => true),
	uploadPaymentProofImage: vi.fn(async () => ({ url: "https://example.com/proof.jpg", publicId: "proof-id" })),
	uploadProfileImage: vi.fn(async () => ({ url: "https://example.com/profile.jpg", publicId: "profile-id" })),
}));

vi.mock("@/services/boardingWorkflow.service.js", () => ({
	boardingWorkflowService: {
		updateBoarding: vi.fn(async () => undefined),
		submitForReview: vi.fn(async () => undefined),
		deactivate: vi.fn(async () => undefined),
		reactivate: vi.fn(async () => undefined),
		archive: vi.fn(async () => undefined),
		restore: vi.fn(async () => undefined),
		getHistory: vi.fn(async () => []),
	},
}));

vi.mock("@/services/review.service.js", () => ({
	reviewService: {
		createReview: vi.fn(async () => makeDoc()),
		getReviewById: vi.fn(async () => makeDoc()),
		getReviewsByBoarding: vi.fn(async () => [makeDoc()]),
		getReviewStats: vi.fn(async () => ({
			averageRating: 4.5,
			totalReviews: 1,
			ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 },
		})),
		getMyReviews: vi.fn(async () => [makeDoc()]),
		getMyBoardingReviews: vi.fn(async () => [makeDoc()]),
		updateReview: vi.fn(async () => makeDoc()),
		deleteReview: vi.fn(async () => undefined),
		addReviewReaction: vi.fn(async () => makeDoc()),
		createReviewComment: vi.fn(async () => makeDoc()),
		updateReviewComment: vi.fn(async () => makeDoc()),
		deleteReviewComment: vi.fn(async () => undefined),
		addReviewCommentReaction: vi.fn(async () => makeDoc()),
	},
}));

vi.mock("@/services/chatAnalysis.service.js", () => ({
	chatAnalysisService: {
		analyzeMessage: vi.fn(async () => ({
			isIssue: true,
			reason: "Contains actionable issue",
			suggestedPriority: "MEDIUM",
		})),
		generateIssueTitle: vi.fn(async () => "Generated Issue Title"),
	},
}));
