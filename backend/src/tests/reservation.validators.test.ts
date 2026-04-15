import { describe, expect, it } from "vitest";
import {
	createReservationSchema,
	rejectReservationSchema,
} from "@/schemas/reservation.validators.js";

const valid = { boardingId: "boarding-abc", moveInDate: "2025-03-01" };

describe("createReservationSchema", () => {
	it("accepts valid data", () =>
		expect(() => createReservationSchema.parse(valid)).not.toThrow());
	it("rejects empty boardingId", () =>
		expect(() =>
			createReservationSchema.parse({ ...valid, boardingId: "" }),
		).toThrow());
	it("rejects non-YYYY-MM-DD moveInDate", () =>
		expect(() =>
			createReservationSchema.parse({ ...valid, moveInDate: "01/03/2025" }),
		).toThrow());
	it("accepts optional specialRequests", () =>
		expect(
			createReservationSchema.parse({
				...valid,
				specialRequests: "Ground floor",
			}).specialRequests,
		).toBe("Ground floor"));
	it("rejects specialRequests > 1000 chars", () =>
		expect(() =>
			createReservationSchema.parse({
				...valid,
				specialRequests: "x".repeat(1001),
			}),
		).toThrow());
});

describe("rejectReservationSchema", () => {
	it("accepts non-empty reason", () =>
		expect(() =>
			rejectReservationSchema.parse({ reason: "Full" }),
		).not.toThrow());
	it("rejects empty reason", () =>
		expect(() => rejectReservationSchema.parse({ reason: "" })).toThrow());
	it("rejects missing reason", () =>
		expect(() => rejectReservationSchema.parse({})).toThrow());
});
