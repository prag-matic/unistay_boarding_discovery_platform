import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/models/index.js", () => {
	const itemQuery = {
		populate: vi.fn().mockReturnThis(),
		sort: vi.fn().mockReturnThis(),
		skip: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
		lean: vi.fn(),
	};
	const reportQuery = {
		populate: vi.fn().mockReturnThis(),
		sort: vi.fn().mockReturnThis(),
		lean: vi.fn(),
	};

	return {
		MarketplaceItem: {
			find: vi.fn(() => itemQuery),
			countDocuments: vi.fn(),
			findById: vi.fn(() => ({ populate: vi.fn().mockReturnThis(), lean: vi.fn() })),
			create: vi.fn(),
			findByIdAndUpdate: vi.fn(() => ({ populate: vi.fn().mockReturnThis(), lean: vi.fn() })),
		},
		MarketplaceReport: {
			find: vi.fn(() => reportQuery),
			findOne: vi.fn(),
			create: vi.fn(),
			findByIdAndUpdate: vi.fn(() => ({ lean: vi.fn() })),
		},
	};
});

import {
	createMarketplaceItem,
	reportMarketplaceItem,
	searchMarketplaceItems,
} from "@/controllers/marketplace.controller.js";
import { ValidationError } from "@/errors/AppError.js";
import { MarketplaceItem, MarketplaceReport } from "@/models/index.js";

const itemModel = MarketplaceItem as unknown as Record<string, any>;
const reportModel = MarketplaceReport as unknown as Record<string, any>;

function mockReq(overrides: Record<string, unknown> = {}) {
	return {
		params: {},
		query: {},
		body: {},
		user: { userId: "507f1f77bcf86cd799439011", role: "STUDENT" },
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

beforeEach(() => {
	vi.clearAllMocks();
});

describe("searchMarketplaceItems", () => {
	it("returns paginated active items", async () => {
		const queryChain = itemModel.find();
		queryChain.lean.mockResolvedValue([{ _id: "i1", sellerId: "u1", images: [] }]);
		itemModel.countDocuments.mockResolvedValue(1);

		const res = mockRes();
		await searchMarketplaceItems(
			mockReq({ query: { page: 1, size: 20, sortBy: "createdAt", sortDir: "desc" } }),
			res,
			next,
		);

		expect(res.json).toHaveBeenCalled();
		const payload = res.json.mock.calls[0][0];
		expect(payload.success).toBe(true);
		expect(payload.data.pagination.total).toBe(1);
	});
});

describe("createMarketplaceItem", () => {
	it("creates listing and returns 201", async () => {
		itemModel.create.mockResolvedValue({ _id: "new-item" });
		itemModel.findById = vi.fn(() => ({
			populate: vi.fn().mockReturnThis(),
			lean: vi.fn().mockResolvedValue({ _id: "new-item", sellerId: "student1", images: [] }),
		}));

		const res = mockRes();
		await createMarketplaceItem(
			mockReq({
				body: {
					title: "Chair",
					description: "Good chair",
					adType: "SELL",
					category: "Furniture",
					itemCondition: "GOOD",
					price: 1000,
					city: "Colombo",
					district: "Colombo",
				},
			}),
			res,
			next,
		);

		expect(res.status).toHaveBeenCalledWith(201);
	});
});

describe("reportMarketplaceItem", () => {
	it("blocks duplicate open reports from same user", async () => {
		itemModel.findById = vi.fn().mockResolvedValue({
			_id: "507f1f77bcf86cd799439012",
			sellerId: "another-user",
			isDeleted: false,
			status: "ACTIVE",
		});
		reportModel.findOne.mockResolvedValue({ _id: "existing-report" });

		await reportMarketplaceItem(
			mockReq({ params: { id: "507f1f77bcf86cd799439012" }, body: { reason: "SPAM" } }),
			mockRes(),
			next,
		);

		expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
	});
});
