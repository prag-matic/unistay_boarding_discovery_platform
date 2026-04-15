import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma.js", () => {
	const db = {
		boarding: {
			findUnique: vi.fn(),
			findMany: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			count: vi.fn(),
		},
		boardingImage: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
		boardingRule: { deleteMany: vi.fn() },
		boardingAmenity: { deleteMany: vi.fn() },
		$transaction: vi.fn(),
	};
	return { default: db, prisma: db };
});

vi.mock("@/utils/slug.js", () => ({
	generateUniqueSlug: vi.fn().mockResolvedValue("my-title"),
}));
vi.mock("@/lib/cloudinary.js", () => ({
	uploadBoardingImage: vi
		.fn()
		.mockResolvedValue({ url: "https://cdn/img.jpg", publicId: "pid" }),
	deleteBoardingImage: vi.fn().mockResolvedValue(undefined),
}));

import {
	activateBoarding,
	createBoarding,
	deactivateBoarding,
	deleteImage,
	getBoardingBySlug,
	getMyListings,
	searchBoardings,
	submitBoarding,
	updateBoarding,
	uploadImages,
} from "@/controllers/boarding.controller.js";
import {
	BoardingNotFoundError,
	ForbiddenError,
	InvalidStateTransitionError,
	ValidationError,
} from "@/errors/AppError.js";
import { deleteBoardingImage, uploadBoardingImage } from "@/lib/cloudinary.js";
import prisma from "@/lib/prisma.js";

const db = prisma as any;

function mockReq(overrides: Record<string, unknown> = {}) {
	return {
		body: {},
		params: {},
		query: {},
		user: { userId: "owner1" },
		files: undefined,
		...overrides,
	} as any;
}
function mockRes() {
	const res: any = {};
	res.status = vi.fn().mockReturnValue(res);
	res.json = vi.fn().mockReturnValue(res);
	return res;
}
const next = vi.fn();

const fakeBoarding = {
	id: "b1",
	ownerId: "owner1",
	title: "Nice Room",
	slug: "nice-room",
	status: "DRAFT",
	isDeleted: false,
	currentOccupants: 0,
	maxOccupants: 2,
	images: [],
	amenities: [],
	rules: [],
	owner: {},
};

beforeEach(() => vi.clearAllMocks());

// ── searchBoardings ───────────────────────────────────────────────────────────
describe("searchBoardings", () => {
	it("returns paginated active boardings", async () => {
		db.$transaction.mockResolvedValue([[fakeBoarding], 1]);
		const res = mockRes();
		await searchBoardings(
			mockReq({
				query: { page: 1, size: 10, sortBy: "createdAt", sortDir: "desc" },
			}),
			res,
			next,
		);
		expect(res.json).toHaveBeenCalled();
		expect(res.json.mock.calls[0][0].data.pagination.total).toBe(1);
	});

	it("calls next on error", async () => {
		db.$transaction.mockRejectedValue(new Error("db"));
		await searchBoardings(
			mockReq({
				query: { page: 1, size: 10, sortBy: "createdAt", sortDir: "desc" },
			}),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalled();
	});
});

// ── getBoardingBySlug ─────────────────────────────────────────────────────────
describe("getBoardingBySlug", () => {
	it("returns boarding for active slug", async () => {
		db.boarding.findUnique.mockResolvedValue({
			...fakeBoarding,
			status: "ACTIVE",
		});
		const res = mockRes();
		await getBoardingBySlug(
			mockReq({ params: { slug: "nice-room" } }),
			res,
			next,
		);
		expect(res.json).toHaveBeenCalled();
	});

	it("throws BoardingNotFoundError when not found", async () => {
		db.boarding.findUnique.mockResolvedValue(null);
		await getBoardingBySlug(
			mockReq({ params: { slug: "x" } }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(BoardingNotFoundError));
	});

	it("throws BoardingNotFoundError when deleted", async () => {
		db.boarding.findUnique.mockResolvedValue({
			...fakeBoarding,
			isDeleted: true,
			status: "ACTIVE",
		});
		await getBoardingBySlug(
			mockReq({ params: { slug: "x" } }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(BoardingNotFoundError));
	});

	it("throws BoardingNotFoundError when not ACTIVE", async () => {
		db.boarding.findUnique.mockResolvedValue({
			...fakeBoarding,
			status: "DRAFT",
		});
		await getBoardingBySlug(
			mockReq({ params: { slug: "x" } }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(BoardingNotFoundError));
	});
});

// ── getMyListings ─────────────────────────────────────────────────────────────
describe("getMyListings", () => {
	it("returns owner listings", async () => {
		db.boarding.findMany.mockResolvedValue([fakeBoarding]);
		const res = mockRes();
		await getMyListings(mockReq(), res, next);
		expect(res.json).toHaveBeenCalled();
		expect(db.boarding.findMany.mock.calls[0][0].where.ownerId).toBe("owner1");
	});
});

// ── createBoarding ────────────────────────────────────────────────────────────
describe("createBoarding", () => {
	it("creates boarding and returns 201", async () => {
		db.boarding.create.mockResolvedValue(fakeBoarding);
		const res = mockRes();
		await createBoarding(
			mockReq({
				body: {
					title: "Nice Room",
					city: "Colombo",
					district: "Colombo",
					address: "x",
					monthlyRent: 10000,
					boardingType: "HOSTEL",
					genderPref: "ANY",
					maxOccupants: 2,
					currentOccupants: 0,
				},
			}),
			res,
			next,
		);
		expect(res.status).toHaveBeenCalledWith(201);
	});

	it("throws ValidationError when currentOccupants > maxOccupants", async () => {
		await createBoarding(
			mockReq({
				body: { title: "x", maxOccupants: 1, currentOccupants: 5 },
			}),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
	});
});

// ── updateBoarding ────────────────────────────────────────────────────────────
describe("updateBoarding", () => {
	it("updates boarding and returns result", async () => {
		db.boarding.findUnique.mockResolvedValue(fakeBoarding);
		db.$transaction.mockImplementation(async (fn: Function) => fn(db));
		db.boardingRule.deleteMany.mockResolvedValue({});
		db.boardingAmenity.deleteMany.mockResolvedValue({});
		db.boarding.update.mockResolvedValue({ ...fakeBoarding, title: "Updated" });
		const res = mockRes();
		await updateBoarding(
			mockReq({ params: { id: "b1" }, body: { title: "Updated" } }),
			res,
			next,
		);
		expect(res.json).toHaveBeenCalled();
	});

	it("throws BoardingNotFoundError when not found", async () => {
		db.boarding.findUnique.mockResolvedValue(null);
		await updateBoarding(
			mockReq({ params: { id: "x" }, body: {} }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(BoardingNotFoundError));
	});

	it("throws ForbiddenError when not owner", async () => {
		db.boarding.findUnique.mockResolvedValue({
			...fakeBoarding,
			ownerId: "other",
		});
		await updateBoarding(
			mockReq({ params: { id: "b1" }, body: {} }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
	});

	it("throws ValidationError when ID missing", async () => {
		await updateBoarding(mockReq({ params: {}, body: {} }), mockRes(), next);
		expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
	});
});

// ── submitBoarding ────────────────────────────────────────────────────────────
describe("submitBoarding", () => {
	it("submits a DRAFT boarding with images", async () => {
		db.boarding.findUnique.mockResolvedValue({
			...fakeBoarding,
			status: "DRAFT",
			images: [{ id: "img1" }],
		});
		db.boarding.update.mockResolvedValue({
			...fakeBoarding,
			status: "PENDING_APPROVAL",
		});
		const res = mockRes();
		await submitBoarding(mockReq({ params: { id: "b1" } }), res, next);
		expect(res.json).toHaveBeenCalled();
	});

	it("throws BoardingNotFoundError when not found", async () => {
		db.boarding.findUnique.mockResolvedValue(null);
		await submitBoarding(mockReq({ params: { id: "x" } }), mockRes(), next);
		expect(next).toHaveBeenCalledWith(expect.any(BoardingNotFoundError));
	});

	it("throws ForbiddenError when not owner", async () => {
		db.boarding.findUnique.mockResolvedValue({
			...fakeBoarding,
			ownerId: "other",
			images: [],
		});
		await submitBoarding(mockReq({ params: { id: "b1" } }), mockRes(), next);
		expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
	});

	it("throws InvalidStateTransitionError from ACTIVE status", async () => {
		db.boarding.findUnique.mockResolvedValue({
			...fakeBoarding,
			status: "ACTIVE",
			images: [{ id: "img1" }],
		});
		await submitBoarding(mockReq({ params: { id: "b1" } }), mockRes(), next);
		expect(next).toHaveBeenCalledWith(expect.any(InvalidStateTransitionError));
	});

	it("throws ValidationError when no images", async () => {
		db.boarding.findUnique.mockResolvedValue({
			...fakeBoarding,
			status: "DRAFT",
			images: [],
		});
		await submitBoarding(mockReq({ params: { id: "b1" } }), mockRes(), next);
		expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
	});
});

// ── deactivateBoarding ────────────────────────────────────────────────────────
describe("deactivateBoarding", () => {
	it("deactivates an ACTIVE boarding", async () => {
		db.boarding.findUnique.mockResolvedValue({
			...fakeBoarding,
			status: "ACTIVE",
		});
		db.boarding.update.mockResolvedValue({
			...fakeBoarding,
			status: "INACTIVE",
		});
		const res = mockRes();
		await deactivateBoarding(mockReq({ params: { id: "b1" } }), res, next);
		expect(res.json).toHaveBeenCalled();
	});

	it("throws BoardingNotFoundError when not found", async () => {
		db.boarding.findUnique.mockResolvedValue(null);
		await deactivateBoarding(mockReq({ params: { id: "x" } }), mockRes(), next);
		expect(next).toHaveBeenCalledWith(expect.any(BoardingNotFoundError));
	});

	it("throws ForbiddenError when not owner", async () => {
		db.boarding.findUnique.mockResolvedValue({
			...fakeBoarding,
			status: "ACTIVE",
			ownerId: "other",
		});
		await deactivateBoarding(
			mockReq({ params: { id: "b1" } }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
	});

	it("throws InvalidStateTransitionError when not ACTIVE", async () => {
		db.boarding.findUnique.mockResolvedValue({
			...fakeBoarding,
			status: "DRAFT",
		});
		await deactivateBoarding(
			mockReq({ params: { id: "b1" } }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(InvalidStateTransitionError));
	});
});

// ── activateBoarding ──────────────────────────────────────────────────────────
describe("activateBoarding", () => {
	it("activates an INACTIVE boarding", async () => {
		db.boarding.findUnique.mockResolvedValue({
			...fakeBoarding,
			status: "INACTIVE",
		});
		db.boarding.update.mockResolvedValue({ ...fakeBoarding, status: "ACTIVE" });
		const res = mockRes();
		await activateBoarding(mockReq({ params: { id: "b1" } }), res, next);
		expect(res.json).toHaveBeenCalled();
	});

	it("throws InvalidStateTransitionError when not INACTIVE", async () => {
		db.boarding.findUnique.mockResolvedValue({
			...fakeBoarding,
			status: "DRAFT",
		});
		await activateBoarding(mockReq({ params: { id: "b1" } }), mockRes(), next);
		expect(next).toHaveBeenCalledWith(expect.any(InvalidStateTransitionError));
	});
});

// ── uploadImages ──────────────────────────────────────────────────────────────
describe("uploadImages", () => {
	it("uploads images and returns 201", async () => {
		db.boarding.findUnique.mockResolvedValue({ ...fakeBoarding, images: [] });
		db.$transaction.mockResolvedValue([
			{
				id: "img1",
				url: "https://cdn/img.jpg",
				publicId: "pid",
				createdAt: new Date(),
			},
		]);
		const res = mockRes();
		const file = { buffer: Buffer.from("x"), mimetype: "image/jpeg" } as any;
		await uploadImages(
			mockReq({ params: { id: "b1" }, files: [file] }),
			res,
			next,
		);
		expect(uploadBoardingImage).toHaveBeenCalledOnce();
		expect(res.status).toHaveBeenCalledWith(201);
	});

	it("throws BoardingNotFoundError when not found", async () => {
		db.boarding.findUnique.mockResolvedValue(null);
		await uploadImages(
			mockReq({ params: { id: "x" }, files: [{}] }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(BoardingNotFoundError));
	});

	it("throws ForbiddenError when not owner", async () => {
		db.boarding.findUnique.mockResolvedValue({
			...fakeBoarding,
			ownerId: "other",
			images: [],
		});
		await uploadImages(
			mockReq({ params: { id: "b1" }, files: [{}] }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
	});

	it("throws ValidationError when no files provided", async () => {
		db.boarding.findUnique.mockResolvedValue(fakeBoarding);
		await uploadImages(
			mockReq({ params: { id: "b1" }, files: [] }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
	});

	it("throws ValidationError when exceeding max images", async () => {
		const existingImages = Array.from({ length: 7 }, (_, i) => ({
			id: `img${i}`,
		}));
		db.boarding.findUnique.mockResolvedValue({
			...fakeBoarding,
			images: existingImages,
		});
		const files = Array.from({ length: 3 }, () => ({
			buffer: Buffer.from("x"),
			mimetype: "image/jpeg",
		}));
		await uploadImages(
			mockReq({ params: { id: "b1" }, files }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
	});
});

// ── deleteImage ───────────────────────────────────────────────────────────────
describe("deleteImage", () => {
	it("deletes image", async () => {
		db.boarding.findUnique.mockResolvedValue(fakeBoarding);
		db.boardingImage.findUnique.mockResolvedValue({
			id: "img1",
			boardingId: "b1",
			publicId: "pid",
		});
		db.boardingImage.delete.mockResolvedValue({});
		const res = mockRes();
		await deleteImage(
			mockReq({ params: { id: "b1", imageId: "img1" } }),
			res,
			next,
		);
		expect(deleteBoardingImage).toHaveBeenCalledWith("pid");
		expect(db.boardingImage.delete).toHaveBeenCalledOnce();
		expect(res.json).toHaveBeenCalled();
	});

	it("throws BoardingNotFoundError when boarding not found", async () => {
		db.boarding.findUnique.mockResolvedValue(null);
		await deleteImage(
			mockReq({ params: { id: "x", imageId: "img1" } }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(BoardingNotFoundError));
	});

	it("throws ForbiddenError when not owner", async () => {
		db.boarding.findUnique.mockResolvedValue({
			...fakeBoarding,
			ownerId: "other",
		});
		await deleteImage(
			mockReq({ params: { id: "b1", imageId: "img1" } }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
	});

	it("throws BoardingNotFoundError when image not found", async () => {
		db.boarding.findUnique.mockResolvedValue(fakeBoarding);
		db.boardingImage.findUnique.mockResolvedValue(null);
		await deleteImage(
			mockReq({ params: { id: "b1", imageId: "img99" } }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith(expect.any(BoardingNotFoundError));
	});
});
