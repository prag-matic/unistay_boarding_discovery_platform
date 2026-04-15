import { describe, expect, it } from "vitest";
import {
	createMarketplaceItemSchema,
	reportMarketplaceItemSchema,
	resolveMarketplaceReportSchema,
	searchMarketplaceQuerySchema,
	updateMarketplaceItemSchema,
} from "@/schemas/marketplace.validators.js";

const validCreatePayload = {
	title: "Gaming chair for sale",
	description: "Comfortable gaming chair in good condition, lightly used.",
	adType: "SELL" as const,
	category: "Furniture",
	itemCondition: "GOOD" as const,
	price: 8000,
	city: "Colombo",
	district: "Colombo",
};

describe("createMarketplaceItemSchema", () => {
	it("accepts valid SELL payload", () => {
		expect(() => createMarketplaceItemSchema.parse(validCreatePayload)).not.toThrow();
	});

	it("requires price for SELL", () => {
		expect(() =>
			createMarketplaceItemSchema.parse({ ...validCreatePayload, price: undefined }),
		).toThrow();
	});

	it("rejects price for GIVEAWAY", () => {
		expect(() =>
			createMarketplaceItemSchema.parse({
				...validCreatePayload,
				adType: "GIVEAWAY",
				price: 100,
			}),
		).toThrow();
	});

	it("accepts GIVEAWAY without price", () => {
		expect(() =>
			createMarketplaceItemSchema.parse({
				...validCreatePayload,
				adType: "GIVEAWAY",
				price: undefined,
			}),
		).not.toThrow();
	});
});

describe("updateMarketplaceItemSchema", () => {
	it("accepts partial payload", () => {
		expect(() => updateMarketplaceItemSchema.parse({ title: "Updated title" })).not.toThrow();
	});

	it("rejects GIVEAWAY with non-null price", () => {
		expect(() =>
			updateMarketplaceItemSchema.parse({ adType: "GIVEAWAY", price: 500 }),
		).toThrow();
	});
});

describe("searchMarketplaceQuerySchema", () => {
	it("uses defaults", () => {
		const parsed = searchMarketplaceQuerySchema.parse({});
		expect(parsed.page).toBe(1);
		expect(parsed.size).toBe(20);
		expect(parsed.sortBy).toBe("createdAt");
		expect(parsed.sortDir).toBe("desc");
	});

	it("coerces numeric query values", () => {
		const parsed = searchMarketplaceQuerySchema.parse({ page: "2", size: "10" });
		expect(parsed.page).toBe(2);
		expect(parsed.size).toBe(10);
	});

	it("rejects invalid sortBy", () => {
		expect(() =>
			searchMarketplaceQuerySchema.parse({ sortBy: "title" }),
		).toThrow();
	});
});

describe("report and resolve schemas", () => {
	it("accepts valid report reason", () => {
		expect(() => reportMarketplaceItemSchema.parse({ reason: "SPAM" })).not.toThrow();
	});

	it("rejects invalid report reason", () => {
		expect(() => reportMarketplaceItemSchema.parse({ reason: "INVALID" })).toThrow();
	});

	it("accepts resolve payload", () => {
		expect(() =>
			resolveMarketplaceReportSchema.parse({ status: "RESOLVED", notes: "handled" }),
		).not.toThrow();
	});
});
