import { describe, expect, it } from "vitest";
import {
	calculatePagination,
	formatDate,
	generateRandomString,
	isFutureDate,
	isPastDate,
	isValidEmail,
	isValidPhone,
	sanitizeUser,
} from "@/utils/index.js";

describe("sanitizeUser", () => {
	it("removes password field", () => {
		const result = sanitizeUser({
			id: "1",
			email: "a@b.com",
			password: "secret",
		} as any);
		expect("password" in result).toBe(false);
		expect(result.email).toBe("a@b.com");
	});
	it("keeps all other fields", () => {
		const result = sanitizeUser({ id: "1", firstName: "John" });
		expect(result.firstName).toBe("John");
	});
	it("works when no password field exists", () => {
		const result = sanitizeUser({ id: "2" });
		expect(result).toEqual({ id: "2" });
	});
});

describe("generateRandomString", () => {
	it("default length is 32", () =>
		expect(generateRandomString()).toHaveLength(32));
	it("custom length", () => expect(generateRandomString(16)).toHaveLength(16));
	it("only alphanumeric chars", () =>
		expect(generateRandomString(50)).toMatch(/^[A-Za-z0-9]+$/));
	it("produces unique strings", () =>
		expect(generateRandomString()).not.toBe(generateRandomString()));
});

describe("isValidEmail", () => {
	it("valid emails return true", () => {
		expect(isValidEmail("user@example.com")).toBe(true);
	});
	it("invalid emails return false", () => {
		expect(isValidEmail("notanemail")).toBe(false);
		expect(isValidEmail("")).toBe(false);
		expect(isValidEmail("@domain.com")).toBe(false);
	});
});

describe("isValidPhone", () => {
	it("valid phone returns true", () => {
		expect(isValidPhone("+94771234567")).toBe(true);
		expect(isValidPhone("0771234567")).toBe(true);
	});
	it("short/empty phone returns false", () => {
		expect(isValidPhone("123")).toBe(false);
		expect(isValidPhone("")).toBe(false);
	});
});

describe("calculatePagination", () => {
	it("computes totalPages correctly", () => {
		const r = calculatePagination(1, 10, 25);
		expect(r.totalPages).toBe(3);
		expect(r.page).toBe(1);
		expect(r.limit).toBe(10);
		expect(r.total).toBe(25);
	});
	it("handles zero total", () =>
		expect(calculatePagination(1, 10, 0).totalPages).toBe(0));
	it("uses defaults", () => {
		const r = calculatePagination(undefined, undefined, 100);
		expect(r.page).toBe(1);
		expect(r.limit).toBe(10);
	});
});

describe("isPastDate / isFutureDate", () => {
	it("isPastDate is true for past dates", () =>
		expect(isPastDate(new Date(Date.now() - 1000))).toBe(true));
	it("isPastDate is false for future dates", () =>
		expect(isPastDate(new Date(Date.now() + 1000))).toBe(false));
	it("isFutureDate is true for future dates", () =>
		expect(isFutureDate(new Date(Date.now() + 1000))).toBe(true));
	it("isFutureDate is false for past dates", () =>
		expect(isFutureDate(new Date(Date.now() - 1000))).toBe(false));
});

describe("formatDate", () => {
	it("returns ISO string", () => {
		expect(formatDate(new Date("2024-01-15T10:00:00.000Z"))).toBe(
			"2024-01-15T10:00:00.000Z",
		);
	});
});
