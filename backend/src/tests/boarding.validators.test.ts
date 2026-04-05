import { describe, expect, it } from "vitest";
import {
	boardingIdParamSchema,
	createBoardingSchema,
	rejectBoardingSchema,
	searchBoardingsQuerySchema,
	updateBoardingSchema,
} from "@/schemas/boarding.validators.js";

const valid = {
	title: "A Nice Boarding House Near Campus",
	description:
		"This is a comfortable boarding house with all necessary amenities for students.",
	city: "Colombo",
	district: "Colombo",
	monthlyRent: 15000,
	boardingType: "SINGLE_ROOM" as const,
	genderPref: "ANY" as const,
	latitude: 6.9271,
	longitude: 79.8612,
	maxOccupants: 2,
};

describe("createBoardingSchema", () => {
	it("accepts valid data", () =>
		expect(() => createBoardingSchema.parse(valid)).not.toThrow());
	it("rejects title < 10 chars", () =>
		expect(() =>
			createBoardingSchema.parse({ ...valid, title: "Short" }),
		).toThrow());
	it("rejects description < 30 chars", () =>
		expect(() =>
			createBoardingSchema.parse({ ...valid, description: "Too short" }),
		).toThrow());
	it("rejects monthlyRent < 1000", () =>
		expect(() =>
			createBoardingSchema.parse({ ...valid, monthlyRent: 500 }),
		).toThrow());
	it("rejects monthlyRent > 500000", () =>
		expect(() =>
			createBoardingSchema.parse({ ...valid, monthlyRent: 600000 }),
		).toThrow());
	it("rejects latitude outside Sri Lanka", () =>
		expect(() =>
			createBoardingSchema.parse({ ...valid, latitude: 0 }),
		).toThrow());
	it("rejects longitude outside Sri Lanka", () =>
		expect(() =>
			createBoardingSchema.parse({ ...valid, longitude: 70 }),
		).toThrow());
	it("rejects maxOccupants < 1", () =>
		expect(() =>
			createBoardingSchema.parse({ ...valid, maxOccupants: 0 }),
		).toThrow());
	it("rejects maxOccupants > 20", () =>
		expect(() =>
			createBoardingSchema.parse({ ...valid, maxOccupants: 25 }),
		).toThrow());
	it("rejects invalid boardingType", () =>
		expect(() =>
			createBoardingSchema.parse({ ...valid, boardingType: "PENTHOUSE" }),
		).toThrow());
	it("rejects invalid genderPref", () =>
		expect(() =>
			createBoardingSchema.parse({ ...valid, genderPref: "BOTH" }),
		).toThrow());
	it("defaults amenities to [] and currentOccupants to 0", () => {
		const r = createBoardingSchema.parse(valid);
		expect(r.amenities).toEqual([]);
		expect(r.currentOccupants).toBe(0);
	});
	it("normalises amenity strings", () => {
		const r = createBoardingSchema.parse({
			...valid,
			amenities: ["wifi", "PARKING"],
		});
		expect(r.amenities).toContain("WIFI");
		expect(r.amenities).toContain("PARKING");
	});
});

describe("updateBoardingSchema", () => {
	it("accepts empty object", () =>
		expect(() => updateBoardingSchema.parse({})).not.toThrow());
	it("accepts partial update", () =>
		expect(
			updateBoardingSchema.parse({ title: "Updated Title Here!" }).title,
		).toBe("Updated Title Here!"));
	it("still validates provided fields", () =>
		expect(() => updateBoardingSchema.parse({ monthlyRent: 100 })).toThrow());
});

describe("boardingIdParamSchema", () => {
	it("accepts non-empty id", () =>
		expect(() => boardingIdParamSchema.parse({ id: "uuid" })).not.toThrow());
	it("rejects empty id", () =>
		expect(() => boardingIdParamSchema.parse({ id: "" })).toThrow());
	it("rejects missing id", () =>
		expect(() => boardingIdParamSchema.parse({})).toThrow());
});

describe("rejectBoardingSchema", () => {
	it("accepts non-empty reason", () =>
		expect(() =>
			rejectBoardingSchema.parse({ reason: "Incomplete" }),
		).not.toThrow());
	it("rejects empty reason", () =>
		expect(() => rejectBoardingSchema.parse({ reason: "" })).toThrow());
});

describe("searchBoardingsQuerySchema", () => {
	it("uses defaults", () => {
		const r = searchBoardingsQuerySchema.parse({});
		expect(r.page).toBe(1);
		expect(r.size).toBe(20);
		expect(r.sortBy).toBe("createdAt");
		expect(r.sortDir).toBe("desc");
	});
	it("coerces page/size from strings", () => {
		const r = searchBoardingsQuerySchema.parse({ page: "2", size: "50" });
		expect(r.page).toBe(2);
		expect(r.size).toBe(50);
	});
	it("rejects size > 100", () =>
		expect(() => searchBoardingsQuerySchema.parse({ size: "200" })).toThrow());
	it("rejects invalid boardingType", () =>
		expect(() =>
			searchBoardingsQuerySchema.parse({ boardingType: "VILLA" }),
		).toThrow());
	it("rejects invalid sortBy", () =>
		expect(() =>
			searchBoardingsQuerySchema.parse({ sortBy: "title" }),
		).toThrow());
	it("accepts all valid filters", () => {
		const r = searchBoardingsQuerySchema.parse({
			city: "Kandy",
			boardingType: "SHARED_ROOM",
			sortDir: "asc",
		});
		expect(r.city).toBe("Kandy");
		expect(r.boardingType).toBe("SHARED_ROOM");
	});
});
